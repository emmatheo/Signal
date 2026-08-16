export function LogoMark({ className = 'h-6 w-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 24" fill="none" aria-hidden="true">
      <path
        d="M1 12h3l2.5-8 3 16 3-11 2.5 6 2-3 2.5 8 3-16 2.5 8H35"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ sub }: { sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-accent">
        <LogoMark />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight text-base-100">Signal</span>
        {sub && <span className="block text-[11px] text-base-500">{sub}</span>}
      </span>
    </div>
  )
}
