'use client'

import { useState } from 'react'
import { useZgStatus } from '@/lib/client/status-context'
import { Spinner } from './ui'

export function StatusBar() {
  const status = useZgStatus()
  const [open, setOpen] = useState(false)

  if (status.loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-base-700 bg-base-800 px-2.5 py-1 text-[11px] text-base-400">
        <Spinner className="h-3 w-3" /> Checking 0G…
      </span>
    )
  }

  if (!status.configured) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-danger" /> 0G not configured
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-base-700 bg-base-850 p-3.5 shadow-xl">
            <p className="text-xs leading-relaxed text-base-300">{status.error}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live on 0G
    </span>
  )
}
