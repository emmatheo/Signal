'use client'

import { useEffect, useState } from 'react'
import type { HistoryPointer, SignalOutput, WatchlistItem } from '@/lib/types'
import { addHistoryPointer, addWatchlistItem, getOwnerId, getWatchlist, removeWatchlistItem } from '@/lib/client/local-store'
import { useZgStatus } from '@/lib/client/status-context'
import { Badge, Button, Card, Mono, Spinner, truncateHash } from './ui'

interface SignalResult {
  itemId: string
  output: SignalOutput
  rootHash: string
  txHash: string
}

export function Watchlist() {
  const status = useZgStatus()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, SignalResult>>({})

  useEffect(() => {
    setItems(getWatchlist())
  }, [])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setItems(addWatchlistItem(input))
    setInput('')
  }

  function handleRemove(id: string) {
    setItems(removeWatchlistItem(id))
    setResults((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleSignal(item: WatchlistItem) {
    setPending(item.id)
    setError(null)
    try {
      const owner = getOwnerId()
      const res = await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: item.label, owner }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signal generation failed.')

      setResults((prev) => ({
        ...prev,
        [item.id]: { itemId: item.id, output: data.record.output, rootHash: data.rootHash, txHash: data.txHash },
      }))

      const pointer: HistoryPointer = {
        rootHash: data.rootHash,
        txHash: data.txHash,
        type: 'signal',
        owner,
        preview: `${item.label}: ${data.record.output.signal}`,
        createdAt: data.record.createdAt,
      }
      addHistoryPointer(pointer)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(null)
    }
  }

  const disabled = status.loading || !status.configured

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-base-100">Watchlist</h2>
        <p className="mt-1 text-xs text-base-400">
          Tokens, contracts, or topics you're tracking. Kept locally in this browser.
        </p>
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. $TIA, 0xabc…, or “restaking narrative”"
            className="flex-1 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 focus:border-accent focus:outline-none"
          />
          <Button type="submit">Add</Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-base-400">Your watchlist is empty. Add a token or topic above.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const result = results[item.id]
            const isPending = pending === item.id
            return (
              <li key={item.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-base-100">{item.label}</p>
                      <p className="text-xs text-base-500">
                        added {new Date(item.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSignal(item)}
                        disabled={disabled || isPending}
                        title={disabled ? '0G backend not configured' : undefined}
                      >
                        {isPending ? <Spinner className="h-3.5 w-3.5" /> : null}
                        {isPending ? 'Generating…' : 'Generate signal'}
                      </Button>
                      <Button variant="danger" onClick={() => handleRemove(item.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  {result && (
                    <div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft p-3">
                      <p className="text-sm text-base-100">{result.output.signal}</p>
                      <p className="mt-1 text-xs text-base-400">{result.output.reason}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge tone="good">Saved to 0G Storage</Badge>
                        <Mono className="text-base-500">{truncateHash(result.rootHash)}</Mono>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <Card className="border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}
    </div>
  )
}
