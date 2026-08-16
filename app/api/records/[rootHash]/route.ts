import { NextResponse } from 'next/server'
import { ZgConfigError } from '@/lib/zg/env'
import { downloadJson, ZgStorageError } from '@/lib/zg/storage'
import type { ZgRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: { rootHash: string } }) {
  const rootHash = params.rootHash?.trim()
  if (!rootHash || !/^0x[a-fA-F0-9]{64}$/.test(rootHash)) {
    return NextResponse.json({ error: 'Invalid 0G Storage root hash.' }, { status: 400 })
  }

  try {
    const record = await downloadJson<ZgRecord>(rootHash)
    return NextResponse.json({ record })
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
