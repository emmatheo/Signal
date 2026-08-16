import type { Metadata } from 'next'
import { ZgStatusProvider } from '@/lib/client/status-context'
import { AppStateProvider } from '@/lib/client/app-state'
import './globals.css'

export const metadata: Metadata = {
  title: 'Signal — Clear signal. Less noise.',
  description:
    'AI-powered crypto research: watchlist, one-click summaries, and short signals — with every summary and signal generated on 0G Compute and stored on 0G Storage.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base-950 font-sans text-base-100 antialiased">
        <ZgStatusProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </ZgStatusProvider>
      </body>
    </html>
  )
}
