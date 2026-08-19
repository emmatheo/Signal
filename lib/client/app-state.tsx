'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { HistoryPointer, SignalRecord, SummaryRecord, WatchlistItem, ZgRecord } from '@/lib/types'
import {
  getHistoryPointers,
  getOwnerId,
  getWatchlist,
  saveHistoryPointers,
  saveWatchlist,
} from './local-store'

export interface LoadedRecord<T extends ZgRecord = ZgRecord> {
  pointer: HistoryPointer
  record: T
}

type RecordsStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AppState {
  ready: boolean
  ownerId: string

  watchlist: WatchlistItem[]
  addItem: (label: string) => void
  removeItem: (id: string) => void

  /** Pointers only — never content. */
  pointers: HistoryPointer[]
  addPointer: (pointer: HistoryPointer) => void

  /** Content fetched from 0G Storage. Held in memory only. */
  records: Record<string, ZgRecord>
  recordErrors: Record<string, string>
  recordsStatus: RecordsStatus
  recordsError: string | null
  reloadRecords: () => void

  signals: LoadedRecord<SignalRecord>[]
  summaries: LoadedRecord<SummaryRecord>[]
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [ownerId, setOwnerId] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [pointers, setPointers] = useState<HistoryPointer[]>([])

  const [records, setRecords] = useState<Record<string, ZgRecord>>({})
  const [recordErrors, setRecordErrors] = useState<Record<string, string>>({})
  const [recordsStatus, setRecordsStatus] = useState<RecordsStatus>('idle')
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // Tracks which hashes have been requested, so adding one record doesn't
  // re-download the whole history.
  const requested = useRef<Set<string>>(new Set())

  useEffect(() => {
    setOwnerId(getOwnerId())
    setWatchlist(getWatchlist())
    setPointers(getHistoryPointers())
    setReady(true)
  }, [])

  const addItem = useCallback((label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    setWatchlist((prev) => {
      if (prev.some((i) => i.label.toLowerCase() === trimmed.toLowerCase())) return prev
      const next = [
        ...prev,
        { id: crypto.randomUUID(), label: trimmed, addedAt: new Date().toISOString() },
      ]
      saveWatchlist(next)
      return next
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((i) => i.id !== id)
      saveWatchlist(next)
      return next
    })
  }, [])

  const addPointer = useCallback((pointer: HistoryPointer) => {
    setPointers((prev) => {
      const next = [pointer, ...prev]
      saveHistoryPointers(next)
      return next
    })
  }, [])

  const reloadRecords = useCallback(() => {
    requested.current.clear()
    setRecords({})
    setRecordErrors({})
    setReloadToken((n) => n + 1)
  }, [])

  // Fetch every pointer's content from 0G Storage. Nothing is rendered from
  // local state, so this is the only way history becomes visible.
  useEffect(() => {
    if (!ready) return

    const missing = pointers.map((p) => p.rootHash).filter((h) => !requested.current.has(h))
    if (missing.length === 0) {
      if (pointers.length === 0) setRecordsStatus('ready')
      return
    }
    missing.forEach((h) => requested.current.add(h))

    let cancelled = false
    ;(async () => {
      setRecordsStatus('loading')
      setRecordsError(null)
      try {
        const res = await fetch('/api/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rootHashes: missing }),
        })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          missing.forEach((h) => requested.current.delete(h))
          setRecordsError(data.error || 'Could not read records from 0G Storage.')
          setRecordsStatus('error')
          return
        }

        setRecords((prev) => ({ ...prev, ...(data.records || {}) }))
        setRecordErrors((prev) => ({ ...prev, ...(data.errors || {}) }))
        setRecordsStatus('ready')
      } catch (err) {
        if (cancelled) return
        missing.forEach((h) => requested.current.delete(h))
        setRecordsError((err as Error).message || 'Could not reach the Signal backend.')
        setRecordsStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, pointers, reloadToken])

  const loaded = <T extends ZgRecord>(type: ZgRecord['type']): LoadedRecord<T>[] =>
    pointers
      .filter((p) => p.type === type)
      .map((pointer) => ({ pointer, record: records[pointer.rootHash] as T }))
      .filter((entry) => Boolean(entry.record))

  const value: AppState = {
    ready,
    ownerId,
    watchlist,
    addItem,
    removeItem,
    pointers,
    addPointer,
    records,
    recordErrors,
    recordsStatus,
    recordsError,
    reloadRecords,
    signals: loaded<SignalRecord>('signal'),
    summaries: loaded<SummaryRecord>('summary'),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider')
  return ctx
}
