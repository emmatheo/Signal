import Link from 'next/link'
import { LogoMark, Wordmark } from '@/components/Logo'

export default function Landing() {
  return (
    <div className="landing-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-sm text-base-300 md:flex">
          <Link href="/app" className="transition-colors hover:text-base-100">
            Research
          </Link>
          <Link href="/app?view=history" className="transition-colors hover:text-base-100">
            History
          </Link>
          <a
            href="https://github.com/emmatheo/Signal#readme"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-base-100"
          >
            Docs
          </a>
        </nav>
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-base-950 transition-colors hover:bg-accent-dim"
        >
          Get started <span aria-hidden>→</span>
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-10 lg:grid-cols-2 lg:pt-20">
        <div>
          <h1 className="font-serif text-6xl leading-[1.05] tracking-tight text-base-100 sm:text-7xl">
            Clear signal.
            <br />
            Less noise.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-base-400">
            AI-powered crypto research, with every summary and signal stored on 0G so you
            actually own the trail.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-medium text-base-950 transition-colors hover:bg-accent-dim"
            >
              Start researching <span aria-hidden>→</span>
            </Link>
            <a
              href="https://github.com/emmatheo/Signal#verifying-its-real-for-judges"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-2 py-3.5 text-sm text-base-300 transition-colors hover:text-base-100"
            >
              See how it works <span aria-hidden>→</span>
            </a>
          </div>

          <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-base-800 pt-7">
            <div>
              <dt className="text-xs text-base-500">Inference</dt>
              <dd className="mt-1 text-sm text-base-200">0G Compute</dd>
            </div>
            <div>
              <dt className="text-xs text-base-500">Storage</dt>
              <dd className="mt-1 text-sm text-base-200">0G Storage</dd>
            </div>
            <div>
              <dt className="text-xs text-base-500">Settlement</dt>
              <dd className="mt-1 text-sm text-base-200">0G Chain</dd>
            </div>
          </dl>
        </div>

        <PreviewPanel />
      </main>
    </div>
  )
}

/**
 * Static structural preview of the product. Deliberately contains no
 * example prices, tickers, or sample signals — it shows the real layout in
 * its empty state so nothing here can be mistaken for live data.
 */
function PreviewPanel() {
  return (
    <div className="rounded-2xl border border-base-700 bg-base-900/80 p-1.5 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-accent">
          <LogoMark className="h-4 w-5" />
        </span>
        <span className="text-sm font-medium text-base-200">Research</span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
          <span className="h-1 w-1 rounded-full bg-accent" /> On 0G
        </span>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-[130px_1fr]">
        <div className="rounded-xl bg-base-850 p-3">
          <p className="text-[11px] font-medium text-base-300">Watchlist</p>
          <div className="mt-3 space-y-2">
            <div className="h-7 rounded-md border border-dashed border-base-700" />
            <div className="h-7 rounded-md border border-dashed border-base-700" />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-base-600">
            Add tokens or topics
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="rounded-xl bg-base-850 p-3">
            <p className="text-[11px] text-base-500">What do you want to research?</p>
          </div>
          <div className="rounded-xl bg-base-850 p-3">
            <p className="text-[11px] font-medium text-base-300">AI summary</p>
            <div className="mt-3 space-y-2.5">
              {['Key points', 'Risks', 'Bottom line'].map((label) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-wide text-base-600">{label}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-base-800" />
                  <div className="mt-1 h-1.5 w-3/5 rounded-full bg-base-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="px-3 py-2.5 text-[10px] text-base-600">
        Results appear here after you run research. Nothing is pre-filled.
      </p>
    </div>
  )
}
