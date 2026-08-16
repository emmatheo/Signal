'use client'

import { useState } from 'react'
import type { HistoryPointer, SummaryOutput } from '@/lib/types'
import { addHistoryPointer, getOwnerId } from '@/lib/client/local-store'
import { useZgStatus } from '@/lib/client/status-context'
import { Badge, Button, Card, Mono, Spinner, truncateHash } from './ui'

type Stage = 'idle' | 'inference' | 'saving' | 'done' | 'error'

export function ResearchPanel() {
  const status = useZgStatus()
  const [raw, setRaw] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState<SummaryOutput | null>(null)
  const [rootHash, setRootHash] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const disabled = status.loading || !status.configured

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!raw.trim()) {
      setError('Paste a link, contract address, thread, or some text first.')
      return
    }

    setError(null)
    setOutput(null)
    setRootHash(null)
    setTxHash(null)
    setStage('inference')

    try {
      const owner = getOwnerId()
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, owner }),
      })
      setStage('saving')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Summarize failed.')

      setOutput(data.record.output)
      setRootHash(data.rootHash)
      setTxHash(data.txHash)
      setStage('done')

      const pointer: HistoryPointer = {
        rootHash: data.rootHash,
        txHash: data.txHash,
        type: 'summary',
        owner,
        preview: data.record.output.bottomLine,
        createdAt: data.record.createdAt,
      }
      addHistoryPointer(pointer)
    } catch (err) {
      setError((err as Error).message)
      setStage('error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-base-100">One-click research</h2>
        <p className="mt-1 text-xs text-base-400">
          Paste a link, contract address, thread, or raw text. 0G Compute returns a short
          structured summary, saved to 0G Storage under your ownership.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="https://… or 0x… or paste a thread / article text"
            rows={6}
            className="w-full resize-none rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-base-500">{raw.length.toLocaleString()} / 20,000</span>
            <Button
              type="submit"
              disabled={disabled || stage === 'inference' || stage === 'saving'}
              title={disabled ? '0G backend not configured' : undefined}
            >
              {stage === 'inference' && (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Running on 0G Compute…
                </>
              )}
              {stage === 'saving' && (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Saving to 0G Storage…
                </>
              )}
              {(stage === 'idle' || stage === 'done' || stage === 'error') && 'Summarize'}
            </Button>
          </div>
        </form>
      </Card>

      {error && (
        <Card className="border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {output && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-base-100">Summary</h3>
            {rootHash && <Badge tone="good">Saved to 0G Storage</Badge>}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-base-500">Key points</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-base-200">
                {output.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-base-500">Risks / concerns</p>
              {output.risks.length > 0 ? (
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-base-200">
                  {output.risks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm text-base-500">None flagged.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-base-500">Bottom line</p>
              <p className="mt-1.5 text-sm text-base-100">{output.bottomLine}</p>
            </div>
          </div>

          {rootHash && txHash && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-base-700 pt-3 text-xs text-base-500">
              <span>
                Root hash: <Mono className="text-base-300">{truncateHash(rootHash, 8)}</Mono>
              </span>
              <span>
                Tx: <Mono className="text-base-300">{truncateHash(txHash, 8)}</Mono>
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
