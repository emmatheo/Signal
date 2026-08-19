import { NextResponse } from 'next/server'
import { ZgConfigError } from '@/lib/zg/env'
import { downloadJson, ZgStorageError } from '@/lib/zg/storage'
import { HASH_PATTERN, rootHashesFromTx, ZgResolveError } from '@/lib/zg/resolve'
import type { ZgRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function looksLikeRecord(value: unknown): value is ZgRecord {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (v.type === 'summary' || v.type === 'signal') && typeof v.output === 'object'
}

/**
 * Recovers previously stored research by storage root hash OR by the 0G Chain
 * transaction hash that submitted it.
 *
 * This path performs NO inference: it reads the existing record out of 0G
 * Storage. Recovering costs a storage read, never another Compute charge.
 */
export async function POST(req: Request) {
  let body: { hash?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const hash = body.hash?.trim()
  if (!hash) {
    return NextResponse.json({ error: 'Paste a storage root hash or transaction hash.' }, { status: 400 })
  }
  if (!HASH_PATTERN.test(hash)) {
    return NextResponse.json(
      {
        error:
          'That is not a valid hash. Expected 0x followed by 64 hex characters (a 0G Storage root hash or a 0G Chain transaction hash).',
      },
      { status: 400 }
    )
  }

  try {
    // A storage root hash and a tx hash are indistinguishable by shape, so
    // check the chain first: a receipt proves it's a transaction, and gives
    // us the root directly. No receipt means treat it as a storage root.
    let rootHash = hash
    let resolvedFrom: 'root' | 'tx' = 'root'
    let txHash: string | undefined

    const roots = await rootHashesFromTx(hash).catch((err) => {
      if (err instanceof ZgResolveError) throw err
      return [] as string[]
    })

    if (roots.length > 0) {
      rootHash = roots[0]
      resolvedFrom = 'tx'
      txHash = hash
    }

    const record = await downloadJson<unknown>(rootHash)

    if (!looksLikeRecord(record)) {
      return NextResponse.json(
        {
          error:
            'That hash points to data on 0G Storage, but it is not a Signal research record.',
        },
        { status: 422 }
      )
    }

    return NextResponse.json({ record, rootHash, txHash, resolvedFrom, regenerated: false })
  } catch (err) {
    if (err instanceof ZgConfigError) {
      return NextResponse.json({ error: err.message, code: 'not_configured' }, { status: 503 })
    }
    if (err instanceof ZgResolveError) {
      return NextResponse.json({ error: err.message, code: 'resolve_error' }, { status: 422 })
    }
    if (err instanceof ZgStorageError) {
      return NextResponse.json(
        {
          error:
            `No Signal record could be read for ${hash}. If this is a transaction hash, ` +
            `it may not be a 0G Storage submission; if it is a storage root, the record ` +
            `may not exist on this network. Details: ${err.message}`,
          code: 'storage_error',
        },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: (err as Error).message || 'Unexpected server error.' },
      { status: 500 }
    )
  }
}
