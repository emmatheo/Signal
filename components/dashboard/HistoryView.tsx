'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/client/app-state'
import type { HistoryPointer, ZgRecord } from '@/lib/types'
import { Mono, Spinner, truncateHash } from '@/components/ui'

export function HistoryView() {
  const { history } = useAppState()
  const [openHash, setOpenHash] = useState<string | null>(null)
  const [records, setRecords] = useState<Record<string, ZgRecord>>({})
  const [loadingHash, setLoadingHash] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <header>
        <h2 className="text-base font-semibold text-base-100">History</h2>
        <p className="mt-1 text-xs text-base-500">
          Everything you've generated, read back from 0G Storage by root hash.
        </p>
      </header>

      {history.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-base-400">Nothing stored yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-base-600">
            Run some research or generate a signal, and it'll be listed here — fetched live
            from 0G Storage each time you open it.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {history.map((pointer) => {
            const isOpen = openHash === pointer.rootHash
            const record = records[pointer.rootHash]
            const err = errors[pointer.rootHash]
            return (
              <li
                key={pointer.rootHash}
                className="rounded-xl border border-base-700 bg-base-900 p-4"
              >
                <button
                  onClick={() => toggle(pointer)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          pointer.type === 'summary'
                            ? 'border-base-600 bg-base-800 text-base-300'
                            : 'border-accent/25 bg-accent-soft text-accent'
                        }`}
                      >
                        {pointer.type}
                      </span>
                      <span className="text-[11px] text-base-600">
                        {new Date(pointer.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-base-200">{pointer.title}</p>
                    <p className="mt-0.5 truncate text-xs text-base-500">{pointer.preview}</p>
                  </div>
                  <span className="shrink-0 text-base-600">{isOpen ? '−' : '+'}</span>
                </button>

                {isOpen && (
                  <div className="mt-4 border-t border-base-800 pt-4">
                    {loadingHash === pointer.rootHash && (
                      <div className="flex items-center gap-2 text-sm text-base-400">
                        <Spinner className="h-3.5 w-3.5" /> Reading from 0G Storage…
                      </div>
                    )}
                    {err && <p className="text-sm text-danger">{err}</p>}
                    {record && <RecordBody record={record} />}
                    <div className="mt-4 flex flex-col gap-1 text-[11px] text-base-600">
                      <span className="break-all">
                        Root hash <Mono className="text-base-400">{pointer.rootHash}</Mono>
                      </span>
                      <span>
                        Tx <Mono className="text-base-400">{truncateHash(pointer.txHash, 8)}</Mono>
                      </span>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RecordBody({ record }: { record: ZgRecord }) {
  if (record.type === 'summary') {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-base-500">Source</p>
          <p className="mt-1 break-words text-base-300">
            <span className="text-base-600">[{record.source.kind}]</span> {record.source.raw}
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
