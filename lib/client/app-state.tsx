'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { HistoryPointer, WatchlistItem } from '@/lib/types'
import {
  getHistoryPointers,
  getOwnerId,
  getWatchlist,
  saveHistoryPointers,
  saveWatchlist,
} from './local-store'

interface AppState {
  ready: boolean
  ownerId: string
  watchlist: WatchlistItem[]
  addItem: (label: string) => void
  removeItem: (id: string) => void
  history: HistoryPointer[]
  addPointer: (pointer: HistoryPointer) => void
  signals: HistoryPointer[]
  summaries: HistoryPointer[]
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [ownerId, setOwnerId] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [history, setHistory] = useState<HistoryPointer[]>([])

  useEffect(() => {
    setOwnerId(getOwnerId())
    setWatchlist(getWatchlist())
    setHistory(getHistoryPointers())
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
    setHistory((prev) => {
      const next = [pointer, ...prev]
      saveHistoryPointers(next)
      return next
    })
  }, [])

  const value: AppState = {
    ready,
    ownerId,
    watchlist,
    addItem,
    removeItem,
    history,
    addPointer,
    signals: history.filter((h) => h.type === 'signal'),
    summaries: history.filter((h) => h.type === 'summary'),
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider')
  return ctx
}
