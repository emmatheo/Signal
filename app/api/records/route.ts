import { NextResponse } from 'next/server'
import { ZgConfigError } from '@/lib/zg/env'
import { downloadJson, ROOT_HASH_PATTERN, ZgStorageError } from '@/lib/zg/storage'
import type { ZgRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_BATCH = 50

/**
 * Batch-reads records from 0G Storage by root hash.
 *
 * Every record the UI displays comes through here (or the single-hash GET) —
 * there is no client-side content cache to fall back on, so a 0G Storage
 * outage surfaces as an error rather than as stale-looking history.
 */
export async function POST(req: Request) {
  let body: { rootHashes?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const input = body.rootHashes
  if (!Array.isArray(input)) {
    return NextResponse.json({ error: 'rootHashes must be an array.' }, { status: 400 })
  }

  const hashes = Array.from(
    new Set(input.filter((h): h is string => typeof h === 'string' && ROOT_HASH_PATTERN.test(h)))
  ).slice(0, MAX_BATCH)

  if (hashes.length === 0) {
    return NextResponse.json({ records: {}, errors: {} })
  }

  try {
    const records: Record<string, ZgRecord> = {}
    const errors: Record<string, string> = {}

    const settled = await Promise.allSettled(
      hashes.map(async (hash) => [hash, await downloadJson<ZgRecord>(hash)] as const)
    )

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]
      if (outcome.status === 'fulfilled') {
        const [hash, record] = outcome.value
        records[hash] = record
      } else {
        errors[hashes[i]] =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason ?? 'Unknown error')
      }
    }

    return NextResponse.json({ records, errors })
  } catch (err) {
    if (err instanceof ZgConfigError) {
      return NextResponse.json({ error: err.message, code: 'not_configured' }, { status: 503 })
    }
    if (err instanceof ZgStorageError) {
      return NextResponse.json({ error: err.message, code: 'storage_error' }, { status: 502 })
    }
    return NextResponse.json(
      { error: (err as Error).message || 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
