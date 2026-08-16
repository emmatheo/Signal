'use client'

import { useAppState } from '@/lib/client/app-state'
import { Mono, truncateHash } from '@/components/ui'

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
  const { signals } = useAppState()

  return (
    <aside className="flex h-full flex-col border-t border-base-800 bg-base-900 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-base-100">
          Signals
          {signals.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </h2>
        {signals.length > 0 && (
          <span className="text-[11px] text-base-500">{signals.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {signals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-700 p-5 text-center">
            <p className="text-xs leading-relaxed text-base-500">
              No signals yet.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-base-600">
              Generate one from a watchlist item and it'll show up here, saved to 0G Storage.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {signals.map((s) => (
              <li
                key={s.rootHash}
                className="rounded-xl border border-base-700 bg-base-850 p-3.5 transition-colors hover:border-base-600"
              >
                <p className="text-sm font-medium text-base-100">{s.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-base-300">{s.preview}</p>
                {s.detail && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-base-500">{s.detail}</p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-base-600">{relativeTime(s.createdAt)}</span>
                  <Mono className="text-[10px] text-base-600">{truncateHash(s.rootHash, 4)}</Mono>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
