'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Wordmark } from '@/components/Logo'
import { StatusBar } from '@/components/StatusBar'
import { WatchlistRail } from './WatchlistRail'
import { ResearchMain } from './ResearchMain'
import { SignalsRail } from './SignalsRail'
import { HistoryView } from './HistoryView'
import { cx } from '@/components/ui'

type View = 'research' | 'history'

export function Dashboard() {
  const params = useSearchParams()
  const initial: View = params.get('view') === 'history' ? 'history' : 'research'
  const [view, setView] = useState<View>(initial)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-6 border-b border-base-800 bg-base-900 px-5 py-3">
        <Link href="/">
          <Wordmark sub="Crypto Research" />
        </Link>

        <nav className="flex items-center gap-1">
          {(['research', 'history'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cx(
                'relative px-3 py-2 text-sm font-medium capitalize transition-colors',
                view === v ? 'text-base-100' : 'text-base-500 hover:text-base-300'
              )}
            >
              {v}
              {view === v && (
                <span className="absolute inset-x-3 -bottom-3 h-px bg-accent" aria-hidden />
              )}
            </button>
          ))}
        </nav>

        <div className="ml-auto">
          <StatusBar />
        </div>
      </header>

      {/*
        One grid, each rail mounted exactly once. On large screens it's three
        columns that scroll independently; below that it reflows to a single
        column (main first, then the rails) and the page scrolls as a whole.
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[220px_1fr_300px] lg:overflow-hidden">
        <div className="order-2 min-h-0 lg:order-1 lg:overflow-y-auto">
          <WatchlistRail />
        </div>

        <main className="order-1 min-h-0 lg:order-2 lg:overflow-y-auto">
          {view === 'research' ? <ResearchMain /> : <HistoryView />}
        </main>

        <div className="order-3 min-h-0 lg:overflow-y-auto">
          <SignalsRail />
        </div>
      </div>
    </div>
  )
}
