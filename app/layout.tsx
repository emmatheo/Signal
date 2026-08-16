import type { Metadata } from 'next'
import { ZgStatusProvider } from '@/lib/client/status-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Signal — AI research, owned on 0G',
  description:
    'Watchlist, one-click AI research summaries, and short trading signals — with every summary, signal, and history entry stored on 0G Storage and every inference run on 0G Compute.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans text-base-100 antialiased">
        <ZgStatusProvider>{children}</ZgStatusProvider>
      </body>
    </html>
  )
}
