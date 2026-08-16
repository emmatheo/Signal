'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/client/app-state'
import { useZgStatus } from '@/lib/client/status-context'
import type { HistoryPointer, WatchlistItem } from '@/lib/types'
import { Spinner } from '@/components/ui'

export function WatchlistRail() {
  const { watchlist, addItem, removeItem, ownerId, addPointer } = useAppState()
  const status = useZgStatus()
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = status.loading || !status.configured

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    addItem(input)
    setInput('')
    setAdding(false)
  }

  async function generate(item: WatchlistItem) {
    setPendingId(item.id)
    setError(null)
    try {
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: item.label, owner: ownerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signal generation failed.')

      const pointer: HistoryPointer = {
        rootHash: data.rootHash,
        txHash: data.txHash,
        type: 'signal',
        owner: ownerId,
        title: item.label,
        preview: data.record.output.signal,
        detail: data.record.output.reason,
        createdAt: data.record.createdAt,
      }
      addPointer(pointer)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <aside className="flex h-full flex-col border-t border-base-800 bg-base-900 lg:border-r lg:border-t-0">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-sm font-semibold text-base-100">Watchlist</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          aria-label="Add watchlist item"
          className="rounded-md p-1 text-base-400 transition-colors hover:bg-base-800 hover:text-base-100"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="px-3 pb-3">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => !input && setAdding(false)}
            placeholder="Token, contract, or topic"
            className="w-full rounded-lg border border-base-700 bg-base-850 px-3 py-2 text-sm text-base-100 placeholder:text-base-600 focus:border-accent focus:outline-none"
          />
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-3">
        {watchlist.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-700 p-5 text-center">
            <p className="text-xs leading-relaxed text-base-500">
              Nothing tracked yet. Add a token, contract, or topic to generate signals for it.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {watchlist.map((item) => (
              <li key={item.id} className="group rounded-lg px-3 py-2.5 transition-colors hover:bg-base-850">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-base-100">{item.label}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.label}`}
                    className="shrink-0 rounded p-0.5 text-base-600 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => generate(item)}
                  disabled={disabled || pendingId === item.id}
                  title={disabled ? '0G backend not configured' : undefined}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pendingId === item.id ? (
                    <>
                      <Spinner className="h-3 w-3" /> Generating…
                    </>
                  ) : (
                    'Generate signal'
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-[11px] leading-relaxed text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-base-800 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-base-600">
          Watchlist is stored in this browser. Signals are stored on 0G Storage.
        </p>
      </div>
    </aside>
  )
}
