import Link from 'next/link'
import { LogoMark, Wordmark } from '@/components/Logo'

export default function Landing() {
  return (
    <div className="landing-bg min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 text-sm text-base-300 md:flex">
          <a href="#how" className="transition-colors hover:text-base-100">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-base-100">
            Features
          </a>
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
          Launch app <span aria-hidden>→</span>
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-base-700 bg-base-900 px-3 py-1 text-[11px] font-medium text-base-300">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Runs on 0G Compute · Stored on 0G Storage
            </span>

            <h1 className="mt-7 font-serif text-6xl leading-[1.04] tracking-tight text-base-100 sm:text-7xl">
              Clear signal.
              <br />
              Less noise.
            </h1>

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-base-400">
              Research crypto once, own it forever. Every summary runs on decentralized
              compute, is stored under a verifiable hash, and can be recovered later without
              paying to generate it again.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-medium text-base-950 transition-colors hover:bg-accent-dim"
              >
                Start researching <span aria-hidden>→</span>
              </Link>
              <Link
                href="/app?view=recover"
                className="inline-flex items-center gap-2 rounded-lg border border-base-700 px-5 py-3.5 text-sm text-base-200 transition-colors hover:bg-base-850"
              >
                Recover by hash
              </Link>
            </div>
          </div>

          <PreviewPanel />
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-base-800 bg-base-900/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-serif text-3xl tracking-tight text-base-100">
              Pay once. Own it. Recover anytime.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-base-400">
              Centralized AI tools keep your research history on their servers. Signal writes
              every result to decentralized storage and hands you the hash.
            </p>

            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Ask',
                  body: 'Submit a link, contract, thread, or raw text. Inference runs on the 0G Compute marketplace and is paid for in 0G.',
                },
                {
                  step: '02',
                  title: 'Own',
                  body: 'The result is written to 0G Storage. You get a content-addressed storage root and an on-chain transaction reference.',
                },
                {
                  step: '03',
                  title: 'Recover',
                  body: 'Paste that hash any time — on any device — to read the stored research back. No model run, no second charge.',
                },
              ].map((s) => (
                <li key={s.step} className="rounded-2xl border border-base-700 bg-base-900 p-6">
                  <span className="font-mono text-xs text-accent">{s.step}</span>
                  <h3 className="mt-3 text-base font-semibold text-base-100">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-base-400">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-3xl tracking-tight text-base-100">
            Built for people who actually do the reading.
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              {
                title: 'One-click research',
                body: 'Paste a link, contract address, thread, or text. Get key points, risks, and a bottom line — structured, short, and scannable. Links are fetched server-side so the model reads the actual page.',
              },
              {
                title: 'Personal signals',
                body: 'Short, readable signals for the tokens and topics on your watchlist. One or two sentences plus the reasoning, never a wall of text.',
              },
              {
                title: '0G-owned history',
                body: 'Your research lives on 0G Storage, not in our database. This app keeps only the hashes — wipe your browser and the records still exist on the network.',
              },
              {
                title: 'Recover by hash',
                body: 'Every result carries a storage root and transaction reference. Paste either one to pull the original research back without re-running the model.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-base-700 bg-base-900 p-6 transition-colors hover:border-base-600"
              >
                <h3 className="text-base font-semibold text-base-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-base-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="border-t border-base-800">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-serif text-2xl tracking-tight text-base-100">
                Start owning your research.
              </h2>
              <p className="mt-2 text-sm text-base-400">
                Requires a funded 0G wallet configured on the server.
              </p>
            </div>
            <Link
              href="/app"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-medium text-base-950 transition-colors hover:bg-accent-dim"
            >
              Launch Signal <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <footer className="border-t border-base-800">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-xs text-base-600">
            <span>Signal</span>
            <span>0G Compute · 0G Storage · 0G Chain</span>
            <span>Informational only. Not financial advice.</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

/**
 * Structural preview of the product. Contains no example prices, tickers, or
 * sample signals — it shows the real layout in its empty state so nothing here
 * can be mistaken for live data.
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

      <div className="grid gap-1.5 sm:grid-cols-[128px_1fr]">
        <div className="rounded-xl bg-base-850 p-3">
          <p className="text-[11px] font-medium text-base-300">Watchlist</p>
          <div className="mt-3 space-y-2">
            <div className="h-7 rounded-md border border-dashed border-base-700" />
            <div className="h-7 rounded-md border border-dashed border-base-700" />
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-base-600">Add tokens or topics</p>
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
          <div className="rounded-xl bg-base-850 px-3 py-2.5">
            <p className="font-mono text-[10px] text-base-600">storage root 0x… · tx 0x…</p>
          </div>
        </div>
      </div>

      <p className="px-3 py-2.5 text-[10px] text-base-600">
        Results appear after you run research. Nothing is pre-filled.
      </p>
    </div>
  )
}
