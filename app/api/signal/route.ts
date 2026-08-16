import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { ZgConfigError } from '@/lib/zg/env'
import { runInference, ZgComputeError } from '@/lib/zg/compute'
import { uploadJson, ZgStorageError } from '@/lib/zg/storage'
import { SIGNAL_SYSTEM_PROMPT, buildSignalUserPrompt, extractJsonObject } from '@/lib/prompts'
import type { SignalOutput, SignalRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function isSignalOutput(value: unknown): value is SignalOutput {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.signal === 'string' && typeof v.reason === 'string'
}

export async function POST(req: Request) {
  let body: { item?: string; owner?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const item = body.item?.trim()
  const owner = body.owner?.trim()
  if (!item) {
    return NextResponse.json({ error: 'Missing watchlist item.' }, { status: 400 })
  }
  if (!owner) {
    return NextResponse.json({ error: 'Missing owner identity.' }, { status: 400 })
  }

  try {
    const inference = await runInference(SIGNAL_SYSTEM_PROMPT, buildSignalUserPrompt(item))

    let parsed: unknown
    try {
      parsed = extractJsonObject(inference.content)
    } catch {
      return NextResponse.json(
        { error: '0G Compute returned a response that could not be parsed as a signal. Try again.' },
        { status: 502 }
      )
    }
    if (!isSignalOutput(parsed)) {
      return NextResponse.json(
        { error: '0G Compute returned an unexpected response shape. Try again.' },
        { status: 502 }
      )
    }

    const record: SignalRecord = {
      type: 'signal',
      id: randomUUID(),
      owner,
      watchlistItem: item,
      output: parsed,
      provider: inference.provider,
      model: inference.model,
      createdAt: new Date().toISOString(),
    }

    const { rootHash, txHash } = await uploadJson(record)

    return NextResponse.json({ record, rootHash, txHash })
  } catch (err) {
    if (err instanceof ZgConfigError) {
      return NextResponse.json({ error: err.message, code: 'not_configured' }, { status: 503 })
    }
    if (err instanceof ZgComputeError) {
      return NextResponse.json({ error: err.message, code: 'compute_error' }, { status: 502 })
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
