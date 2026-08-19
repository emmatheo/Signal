'use client'

import { useState } from 'react'
import type { ZgRecord } from '@/lib/types'
import { Mono, truncateHash } from '@/components/ui'

export function RecordBody({ record }: { record: ZgRecord }) {
  if (record.type === 'signal') {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-base-500">
          {record.watchlistItem}
        </p>
        <p className="leading-relaxed text-base-100">{record.output.signal}</p>
        <p className="text-base-400">{record.output.reason}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <Section label="Source">
        <p className="break-words text-base-300">
          <span className="text-base-600">[{record.source.kind}]</span> {record.source.raw}
        </p>
      </Section>
      <Section label="Key points">
        <ul className="space-y-1.5">
          {record.output.keyPoints.map((p, i) => (
            <li key={i} className="flex gap-2.5 leading-relaxed text-base-200">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
      </Section>
      {record.output.risks.length > 0 && (
        <Section label="Risks">
          <ul className="space-y-1.5">
            {record.output.risks.map((r, i) => (
              <li key={i} className="flex gap-2.5 leading-relaxed text-base-200">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-warn" />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section label="Bottom line">
        <p className="leading-relaxed text-base-100">{record.output.bottomLine}</p>
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-base-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

/** Proof references for a stored record, with copy-to-clipboard. */
export function ProofRefs({
  rootHash,
  txHash,
  model,
  provider,
}: {
  rootHash: string
  txHash?: string
  model?: string
  provider?: string
}) {
  return (
    <div className="mt-4 space-y-1.5 border-t border-base-800 pt-3">
      <ProofRow label="Storage root" value={rootHash} />
      {txHash && <ProofRow label="Tx" value={txHash} />}
      {model && <ProofRow label="Model" value={model} copyable={false} />}
      {provider && <ProofRow label="Provider" value={provider} />}
    </div>
  )
}

function ProofRow({
  label,
  value,
  copyable = true,
}: {
  label: string
  value: string
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // Clipboard can be unavailable (insecure origin / denied permission).
      // The full value is shown regardless, so this is not worth surfacing.
    }
  }

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 shrink-0 text-base-600">{label}</span>
      <Mono className="min-w-0 flex-1 truncate text-base-400" title={value}>
        {value.length > 24 ? truncateHash(value, 10) : value}
      </Mono>
      {copyable && (
        <button
          onClick={copy}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  )
}
