import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { ZgConfigError } from '@/lib/zg/env'
import { runInference, ZgComputeError } from '@/lib/zg/compute'
import { uploadJson, ZgStorageError } from '@/lib/zg/storage'
import { fetchSourceText } from '@/lib/fetch-source'
import { SUMMARY_SYSTEM_PROMPT, buildSummaryUserPrompt, extractJsonObject } from '@/lib/prompts'
import type { InputKind, SummaryOutput, SummaryRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const VALID_KINDS: InputKind[] = ['url', 'contract', 'thread', 'text']

function detectKind(raw: string): InputKind {
  const trimmed = raw.trim()
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return 'contract'
  if (/^https?:\/\/(x\.com|twitter\.com)\//i.test(trimmed)) return 'thread'
  if (/^https?:\/\//i.test(trimmed)) return 'url'
  return 'text'
}

function isSummaryOutput(value: unknown): value is SummaryOutput {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.keyPoints) &&
    v.keyPoints.every((x) => typeof x === 'string') &&
    Array.isArray(v.risks) &&
    v.risks.every((x) => typeof x === 'string') &&
    typeof v.bottomLine === 'string'
  )
}

export async function POST(req: Request) {
  let body: { raw?: string; kind?: string; owner?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const raw = body.raw?.trim()
  const owner = body.owner?.trim()
  if (!raw) {
    return NextResponse.json(
      { error: 'Nothing to summarize — paste a link, contract address, thread, or text.' },
      { status: 400 }
    )
  }
  if (!owner) {
    return NextResponse.json({ error: 'Missing owner identity.' }, { status: 400 })
  }
  if (raw.length > 20000) {
    return NextResponse.json(
      { error: 'Input is too long (max 20,000 characters).' },
      { status: 400 }
    )
  }

  const kind: InputKind =
    body.kind && VALID_KINDS.includes(body.kind as InputKind)
      ? (body.kind as InputKind)
      : detectKind(raw)

  try {
    // For links, retrieve the page so the model summarizes real content
    // rather than guessing from the URL string. Never fatal: on failure this
    // falls back to the raw input and reports why.
    const source = await fetchSourceText(raw)

    const inference = await runInference(
      SUMMARY_SYSTEM_PROMPT,
      buildSummaryUserPrompt(kind, source.text)
    )

    let parsed: unknown
    try {
      parsed = extractJsonObject(inference.content)
    } catch {
      return NextResponse.json(
        {
          error:
            '0G Compute returned a response that could not be parsed as a structured summary. Try again.',
        },
        { status: 502 }
      )
    }
    if (!isSummaryOutput(parsed)) {
      return NextResponse.json(
        { error: '0G Compute returned an unexpected response shape. Try again.' },
        { status: 502 }
      )
    }

    const record: SummaryRecord = {
      type: 'summary',
      id: randomUUID(),
      owner,
      source: { kind, raw },
      output: parsed,
      provider: inference.provider,
      model: inference.model,
      createdAt: new Date().toISOString(),
    }

    const { rootHash, txHash } = await uploadJson(record)

    return NextResponse.json({
      record,
      rootHash,
      txHash,
      sourceFetched: source.fetched,
      sourceNote: source.note,
    })
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
