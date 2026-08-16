'use client'

import { useZgStatus } from '@/lib/client/status-context'
import { Badge, Spinner } from './ui'

export function StatusBar() {
  const status = useZgStatus()

  if (status.loading) {
    return (
      <Badge tone="neutral">
        <Spinner className="h-3 w-3" /> Checking 0G connection…
      </Badge>
    )
  }

  if (!status.configured) {
    return (
      <div className="flex flex-col gap-1">
        <Badge tone="bad">0G backend not configured</Badge>
        <p className="max-w-2xl text-xs text-base-400">{status.error}</p>
      </div>
    )
  }

  return (
    <Badge tone="good">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Live on 0G · Compute + Storage
    </Badge>
  )
}
