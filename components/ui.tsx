'use client'

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-base-700 bg-base-850/60 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  const variants = {
    primary: 'bg-accent text-base-950 hover:bg-accent-dim',
    ghost: 'bg-transparent text-base-200 hover:bg-base-800 border border-base-700',
    danger: 'bg-transparent text-danger hover:bg-danger/10 border border-danger/30',
  }
  return <button className={cx(base, variants[variant], className)} {...props} />
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'good' | 'bad' | 'warn'
  children: ReactNode
}) {
  const tones = {
    neutral: 'bg-base-800 text-base-300 border-base-700',
    good: 'bg-accent-soft text-accent border-accent/30',
    bad: 'bg-danger/10 text-danger border-danger/30',
    warn: 'bg-warn/10 text-warn border-warn/30',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('font-mono text-xs tracking-tight', className)}>{children}</span>
}

export function truncateHash(hash: string, size = 6): string {
  if (hash.length <= size * 2 + 3) return hash
  return `${hash.slice(0, size + 2)}…${hash.slice(-size)}`
}
