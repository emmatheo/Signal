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
 * records belong to this browser. It is not a cryptographic identity.
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

export function saveWatchlist(list: WatchlistItem[]) {
  write(WATCHLIST_KEY, list)
}

/**
 * Local index of where this browser's records live on 0G Storage.
 *
 * Content is never stored here. Values are sanitized on read so that a
 * pointer written by an older build (which did cache preview text) cannot
 * be rendered as if it had come back from 0G Storage.
 */
export function getHistoryPointers(): HistoryPointer[] {
  const raw = read<unknown[]>(HISTORY_KEY, [])
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const e = entry as Record<string, unknown>
    if (typeof e.rootHash !== 'string' || typeof e.txHash !== 'string') return []
    if (e.type !== 'summary' && e.type !== 'signal') return []
    return [
      {
        rootHash: e.rootHash,
        txHash: e.txHash,
        type: e.type,
        createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(0).toISOString(),
      },
    ]
  })
}

export function saveHistoryPointers(pointers: HistoryPointer[]) {
  write(HISTORY_KEY, pointers)
}
