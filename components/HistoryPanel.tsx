'use client'

import { useEffect, useState } from 'react'
import type { HistoryPointer, ZgRecord } from '@/lib/types'
import { getHistoryPointers } from '@/lib/client/local-store'
import { Badge, Card, Mono, Spinner, truncateHash } from './ui'

export function HistoryPanel() {
  const [pointers, setPointers] = useState<HistoryPointer[]>([])
  const [openHash, setOpenHash] = useState<string | null>(null)
  const [records, setRecords] = useState<Record<string, ZgRecord>>({})
  const [loadingHash, setLoadingHash] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setPointers(getHistoryPointers())
  }, [])

  async function toggle(pointer: HistoryPointer) {
    if (openHash === pointer.rootHash) {
      setOpenHash(null)
      return
    }
    setOpenHash(pointer.rootHash)
    if (records[pointer.rootHash]) return

    setLoadingHash(pointer.rootHash)
    setErrors((prev) => ({ ...prev, [pointer.rootHash]: '' }))
    try {
      const res = await fetch(`/api/records/${pointer.rootHash}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not read this record from 0G Storage.')
      setRecords((prev) => ({ ...prev, [pointer.rootHash]: data.record }))
    } catch (err) {
      setErrors((prev) => ({ ...prev, [pointer.rootHash]: (err as Error).message }))
    } finally {
      setLoadingHash(null)
    }
  }

  if (pointers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-base-400">
          No history yet. Summaries and signals you generate will appear here, read live from
          0G Storage.
        </p>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {pointers.map((pointer) => {
        const isOpen = openHash === pointer.rootHash
        const record = records[pointer.rootHash]
        const err = errors[pointer.rootHash]
        return (
          <li key={pointer.rootHash}>
            <Card className="p-4">
              <button
                onClick={() => toggle(pointer)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={pointer.type === 'summary' ? 'neutral' : 'warn'}>
                      {pointer.type}
                    </Badge>
                    <span className="text-xs text-base-500">
                      {new Date(pointer.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm text-base-200">{pointer.preview}</p>
                </div>
                <span className="shrink-0 text-base-500">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="mt-4 border-t border-base-700 pt-4">
                  {loadingHash === pointer.rootHash && (
                    <div className="flex items-center gap-2 text-sm text-base-400">
                      <Spinner className="h-3.5 w-3.5" /> Reading from 0G Storage…
                    </div>
                  )}
                  {err && <p className="text-sm text-danger">{err}</p>}
                  {record && <RecordBody record={record} />}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-base-500">
                    <span>
                      Root hash: <Mono className="text-base-300">{pointer.rootHash}</Mono>
                    </span>
                    <span>
                      Tx: <Mono className="text-base-300">{truncateHash(pointer.txHash, 8)}</Mono>
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

function RecordBody({ record }: { record: ZgRecord }) {
  if (record.type === 'summary') {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-base-500">Source</p>
          <p className="mt-1 break-words text-base-300">
            <span className="text-base-500">[{record.source.kind}]</span> {record.source.raw}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-base-500">Key points</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-base-200">
            {record.output.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        {record.output.risks.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-base-500">Risks</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-base-200">
              {record.output.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-base-500">Bottom line</p>
          <p className="mt-1 text-base-100">{record.output.bottomLine}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-base-500">
        {record.watchlistItem}
      </p>
      <p className="text-base-100">{record.output.signal}</p>
      <p className="text-base-400">{record.output.reason}</p>
    </div>
  )
}
