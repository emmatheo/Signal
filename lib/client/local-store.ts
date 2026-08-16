import type { HistoryPointer, WatchlistItem } from '@/lib/types'

const OWNER_KEY = 'signal:owner-id'
const WATCHLIST_KEY = 'signal:watchlist'
const HISTORY_KEY = 'signal:history-pointers'

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

/**
 * Signal has no wallet-connect flow (see lib/zg/wallet.ts) — a single
 * server-held signer pays for and signs every on-chain 0G action. This
 * browser-local id is what "owner" means in that context: it tags which
 * records belong to this browser, and scopes the local pointer index below.
 * It is not a cryptographic identity.
 */
export function getOwnerId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(OWNER_KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(OWNER_KEY, id)
  }
  return id
}

export function getWatchlist(): WatchlistItem[] {
  return read<WatchlistItem[]>(WATCHLIST_KEY, [])
}

export function addWatchlistItem(label: string): WatchlistItem[] {
  const list = getWatchlist()
  const trimmed = label.trim()
  if (!trimmed) return list
  if (list.some((i) => i.label.toLowerCase() === trimmed.toLowerCase())) return list
  const next = [...list, { id: crypto.randomUUID(), label: trimmed, addedAt: new Date().toISOString() }]
  write(WATCHLIST_KEY, next)
  return next
}

export function removeWatchlistItem(id: string): WatchlistItem[] {
  const next = getWatchlist().filter((i) => i.id !== id)
  write(WATCHLIST_KEY, next)
  return next
}

/**
 * Actual summary/signal content lives only on 0G Storage — this is a local
 * index of {rootHash, txHash} pointers so the History tab knows what to
 * fetch. Opening an item always re-reads its content from 0G Storage
 * (see components/HistoryPanel.tsx); nothing here substitutes for that.
 */
export function getHistoryPointers(): HistoryPointer[] {
  return read<HistoryPointer[]>(HISTORY_KEY, [])
}

export function addHistoryPointer(pointer: HistoryPointer): HistoryPointer[] {
  const next = [pointer, ...getHistoryPointers()]
  write(HISTORY_KEY, next)
  return next
}
