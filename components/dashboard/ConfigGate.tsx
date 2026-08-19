'use client'

import { useZgStatus } from '@/lib/client/status-context'

/**
 * Prominent blocking notice shown whenever the 0G backend is not usable.
 * Signal has no offline mode: without Compute and Storage it cannot generate
 * or read research, so this states that plainly instead of leaving the user
 * to discover greyed-out buttons.
 */
export function ConfigGate() {
  const status = useZgStatus()
  if (status.loading || status.configured) return null

  return (
    <div className="border-b border-danger/25 bg-danger/[0.07]">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          <h2 className="text-sm font-semibold text-danger">0G is not configured</h2>
        </div>
        <p className="text-xs leading-relaxed text-base-300">
          Signal runs entirely on 0G. Until the server has a funded 0G wallet, it cannot
          generate research, generate signals, or read stored history — and it will not
          fabricate any of them.
        </p>
        {status.error && (
          <p className="rounded-lg border border-base-700 bg-base-900 p-2.5 font-mono text-[11px] leading-relaxed text-base-400">
            {status.error}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-base-500">
          Set <code className="text-base-300">ZG_PRIVATE_KEY</code> in your environment, fund
          that address from the 0G faucet, then verify with{' '}
          <code className="text-base-300">npm run doctor</code>.
        </p>
      </div>
    </div>
  )
}
