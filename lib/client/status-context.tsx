'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface ZgStatus {
  loading: boolean
  configured: boolean
  error: string | null
  evmRpc?: string
  indexerRpc?: string
}

const ZgStatusContext = createContext<ZgStatus>({ loading: true, configured: false, error: null })

export function ZgStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ZgStatus>({ loading: true, configured: false, error: null })

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        if (cancelled) return
        setStatus({
          loading: false,
          configured: Boolean(data.configured),
          error: data.error ?? null,
          evmRpc: data.evmRpc,
          indexerRpc: data.indexerRpc,
        })
      } catch {
        if (cancelled) return
        setStatus({
          loading: false,
          configured: false,
          error: 'Could not reach the Signal backend to check 0G connectivity.',
        })
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  return <ZgStatusContext.Provider value={status}>{children}</ZgStatusContext.Provider>
}

export function useZgStatus() {
  return useContext(ZgStatusContext)
}
