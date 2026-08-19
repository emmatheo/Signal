'use client'

import { useState } from 'react'
import { useAppState } from '@/lib/client/app-state'
import type { HistoryPointer, ZgRecord } from '@/lib/types'
import { Mono, Spinner, truncateHash } from '@/components/ui'

export function HistoryView() {
  const { pointers, records, recordErrors, recordsStatus, recordsError, reloadRecords } =
    useAppState()
  const [openHash, setOpenHash] = useState<string | null>(null)

  const loading = recordsStatus === 'loading'
  const failed = recordsStatus === 'error'
  const readable = pointers.filter((p) => records[p.rootHash])

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-base-100">History</h2>
          <p className="mt-1 text-xs text-base-500">
            Read live from 0G Storage by root hash. Nothing is cached locally.
          </p>
        </div>
        {pointers.length > 0 && (
          <button
            onClick={reloadRecords}
            className="shrink-0 text-[11px] font-medium text-accent hover:opacity-80"
          >
            Reload from 0G
          </button>
        )}
      </header>

      {pointers.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-base-400">Nothing stored yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-base-600">
            Run some research or generate a signal, and it'll be listed here — fetched from
            0G Storage each time this page loads.
          </p>
        </div>
      ) : loading && readable.length === 0 ? (
        <div className="mt-16 flex items-center justify-center gap-2 text-sm text-base-400">
          <Spinner className="h-4 w-4" /> Reading {pointers.length} record(s) from 0G Storage…
        </div>
      ) : failed && readable.length === 0 ? (
        <div className="mt-10 rounded-xl border border-danger/30 bg-danger/5 p-5">
          <p className="text-sm text-danger">Could not read your history from 0G Storage.</p>
          {recordsError && <p className="mt-2 text-xs text-base-400">{recordsError}</p>}
          <p className="mt-3 text-xs leading-relaxed text-base-500">
            Your {pointers.length} record(s) still exist on 0G Storage — this is a read
            failure, not data loss. Nothing is shown from a local cache by design.
          </p>
          <button
            onClick={reloadRecords}
            className="mt-4 rounded-lg border border-base-700 px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-800"
          >
            Retry
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {pointers.map((pointer) => (
            <HistoryRow
              key={pointer.rootHash}
              pointer={pointer}
              record={records[pointer.rootHash]}
              error={recordErrors[pointer.rootHash]}
              open={openHash === pointer.rootHash}
              onToggle={() =>
                setOpenHash(openHash === pointer.rootHash ? null : pointer.rootHash)
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoryRow({
  pointer,
  record,
  error,
  open,
  onToggle,
}: {
  pointer: HistoryPointer
  record?: ZgRecord
  error?: string
  open: boolean
  onToggle: () => void
}) {
  const title = record
    ? record.type === 'signal'
      ? record.watchlistItem
      : record.source.raw.slice(0, 80)
    : null
  const preview = record
    ? record.type === 'signal'
      ? record.output.signal
      : record.output.bottomLine
    : null

  return (
    <li className="rounded-xl border border-base-700 bg-base-900 p-4">
      <button
        onClick={onToggle}
        disabled={!record}
        className="flex w-full items-start justify-between gap-3 text-left disabled:cursor-default"
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

          {record ? (
            <>
              <p className="mt-1.5 truncate text-sm text-base-200">{title}</p>
              <p className="mt-0.5 truncate text-xs text-base-500">{preview}</p>
            </>
          ) : error ? (
            <p className="mt-1.5 text-xs leading-relaxed text-danger">
              Unavailable from 0G Storage — {error}
            </p>
          ) : (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-base-500">
              <Spinner className="h-3 w-3" /> Reading from 0G Storage…
            </p>
          )}
        </div>
        {record && <span className="shrink-0 text-base-600">{open ? '−' : '+'}</span>}
      </button>

      {open && record && (
        <div className="mt-4 border-t border-base-800 pt-4">
          <RecordBody record={record} />
          <div className="mt-4 flex flex-col gap-1 text-[11px] text-base-600">
            <span className="break-all">
              Root hash <Mono className="text-base-400">{pointer.rootHash}</Mono>
            </span>
            <span>
              Tx <Mono className="text-base-400">{truncateHash(pointer.txHash, 8)}</Mono>
            </span>
            <span>
              Model <Mono className="text-base-400">{record.model}</Mono>
            </span>
          </div>
        </div>
      )}
    </li>
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
