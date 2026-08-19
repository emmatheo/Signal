'use client'

import { useAppState } from '@/lib/client/app-state'
import { Mono, Spinner, truncateHash } from '@/components/ui'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function SignalsRail() {
  const { signals, pointers, recordErrors, recordsStatus, recordsError, reloadRecords } =
    useAppState()

  const signalPointers = pointers.filter((p) => p.type === 'signal')
  const loading = recordsStatus === 'loading'
  const firstRecordError = signalPointers.map((p) => recordErrors[p.rootHash]).find(Boolean)

  return (
    <aside className="flex h-full flex-col border-t border-base-800 bg-base-900 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-base-100">
          Signals
          {signals.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </h2>
        {signals.length > 0 && <span className="text-[11px] text-base-500">{signals.length}</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {signalPointers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-700 p-5 text-center">
            <p className="text-xs leading-relaxed text-base-500">No signals yet.</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-base-600">
              Generate one from a watchlist item and it'll show up here, saved to 0G Storage.
            </p>
          </div>
        ) : loading && signals.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-base-700 p-5 text-xs text-base-400">
            <Spinner className="h-3.5 w-3.5" /> Reading from 0G Storage…
          </div>
        ) : signals.length === 0 ? (
          // Pointers exist but nothing came back from 0G Storage. Say so —
          // never render an empty list as if there were no signals.
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-xs leading-relaxed text-danger">
              {signalPointers.length} signal(s) could not be read from 0G Storage.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-base-500">
              {recordsError ||
                firstRecordError ||
                'The records exist on 0G Storage but could not be retrieved right now.'}
            </p>
            <button
              onClick={reloadRecords}
              className="mt-3 text-[11px] font-medium text-accent hover:opacity-80"
            >
              Retry
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {signals.map(({ pointer, record }) => (
              <li
                key={pointer.rootHash}
                className="rounded-xl border border-base-700 bg-base-850 p-3.5 transition-colors hover:border-base-600"
              >
                <p className="text-sm font-medium text-base-100">{record.watchlistItem}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-base-300">
                  {record.output.signal}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-base-500">
                  {record.output.reason}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-base-600">
                    {relativeTime(record.createdAt)}
                  </span>
                  <Mono className="text-[10px] text-base-600">
                    {truncateHash(pointer.rootHash, 4)}
                  </Mono>
                </div>
              </li>
            ))}
          </ul>
        )}

        {signals.length > 0 && signalPointers.length > signals.length && (
          <p className="mt-3 text-[11px] leading-relaxed text-warn">
            {signalPointers.length - signals.length} more signal(s) could not be read from 0G
            Storage.
          </p>
        )}
      </div>
    </aside>
  )
}
