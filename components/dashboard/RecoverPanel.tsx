'use client'

import { useState } from 'react'
import type { ZgRecord } from '@/lib/types'
import { useZgStatus } from '@/lib/client/status-context'
import { Spinner } from '@/components/ui'
import { ProofRefs, RecordBody } from './RecordView'

interface Recovered {
  record: ZgRecord
  rootHash: string
  txHash?: string
  resolvedFrom: 'root' | 'tx'
}

export function RecoverPanel() {
  const status = useZgStatus()
  const [hash, setHash] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Recovered | null>(null)

  const disabled = status.loading || !status.configured

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!hash.trim()) {
      setError('Paste a 0G Storage root hash or a 0G Chain transaction hash.')
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hash.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not recover that record.')
      setResult({
        record: data.record,
        rootHash: data.rootHash,
        txHash: data.txHash,
        resolvedFrom: data.resolvedFrom,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <header>
        <h2 className="text-base font-semibold text-base-100">Recover by hash</h2>
        <p className="mt-1 text-xs leading-relaxed text-base-500">
          Paste a storage root hash or the transaction that stored it. Signal reads the
          existing record from 0G Storage — it does not re-run inference, so recovery costs
          no Compute.
        </p>
      </header>

      <form onSubmit={submit} className="mt-5">
        <div className="flex gap-2">
          <input
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-base-700 bg-base-900 px-3 py-2.5 font-mono text-xs text-base-100 placeholder:text-base-600 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={disabled || busy}
            title={disabled ? '0G backend not configured' : undefined}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-medium text-base-950 transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && <Spinner className="h-3 w-3" />}
            {busy ? 'Reading 0G Storage…' : 'Recover'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm leading-relaxed text-danger">{error}</p>
        </div>
      )}

      {result && (
        <article className="mt-6 rounded-xl border border-base-700 bg-base-900 p-5">
          <header className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-0.5 text-[10px] font-medium text-accent">
              Recovered from 0G Storage
            </span>
            <span className="rounded-full border border-base-600 bg-base-800 px-2.5 py-0.5 text-[10px] font-medium text-base-300">
              {result.record.type}
            </span>
            <span className="rounded-full border border-base-700 px-2.5 py-0.5 text-[10px] text-base-500">
              no Compute charged
            </span>
          </header>

          <p className="mt-2.5 text-[11px] text-base-500">
            {result.resolvedFrom === 'tx'
              ? 'Resolved the storage root from that transaction, then read the record.'
              : 'Read directly by storage root.'}{' '}
            Stored {new Date(result.record.createdAt).toLocaleString()}.
          </p>

          <div className="mt-5">
            <RecordBody record={result.record} />
          </div>

          <ProofRefs
            rootHash={result.rootHash}
            txHash={result.txHash}
            model={result.record.model}
            provider={result.record.provider}
          />
        </article>
      )}
    </div>
  )
}
