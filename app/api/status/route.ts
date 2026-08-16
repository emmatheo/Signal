import { NextResponse } from 'next/server'
import { getZgEnv, ZgConfigError } from '@/lib/zg/env'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  try {
    const env = getZgEnv()
    return NextResponse.json({
      configured: true,
      evmRpc: env.evmRpc,
      indexerRpc: env.indexerRpc,
      providerPinned: Boolean(env.providerAddress),
    })
  } catch (err) {
    if (err instanceof ZgConfigError) {
      return NextResponse.json({ configured: false, error: err.message }, { status: 200 })
    }
    return NextResponse.json(
      { configured: false, error: (err as Error).message || 'Unknown error' },
      { status: 200 }
    )
  }
}
