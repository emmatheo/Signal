'use client'

import { useState } from 'react'
import { StatusBar } from '@/components/StatusBar'
import { Watchlist } from '@/components/Watchlist'
import { ResearchPanel } from '@/components/ResearchPanel'
import { HistoryPanel } from '@/components/HistoryPanel'
import { cx } from '@/components/ui'

const TABS = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'research', label: 'Research' },
  { id: 'history', label: 'History' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function Home() {
  const [tab, setTab] = useState<TabId>('research')

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-base-100">Signal</h1>
            <p className="mt-1 text-sm text-base-400">
              AI research and signals for your watchlist — owned on 0G.
            </p>
          </div>
          <StatusBar />
        </div>

        <nav className="flex gap-1 rounded-xl border border-base-700 bg-base-900 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                tab === t.id ? 'bg-base-800 text-base-100' : 'text-base-400 hover:text-base-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <section>
        {tab === 'watchlist' && <Watchlist />}
        {tab === 'research' && <ResearchPanel />}
        {tab === 'history' && <HistoryPanel />}
      </section>

      <footer className="mt-4 border-t border-base-800 pt-6 text-xs text-base-600">
        Every summary and signal is generated via 0G Compute and stored on 0G Storage. No
        centralized AI or local database is used as the source of truth.
      </footer>
    </main>
  )
}
