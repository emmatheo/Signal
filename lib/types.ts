export type InputKind = 'url' | 'contract' | 'thread' | 'text'

export interface SourceInput {
  kind: InputKind
  raw: string
}

export interface SummaryOutput {
  keyPoints: string[]
  risks: string[]
  bottomLine: string
}

export interface SummaryRecord {
  type: 'summary'
  id: string
  owner: string
  source: SourceInput
  output: SummaryOutput
  provider: string
  model: string
  createdAt: string
}

export interface SignalOutput {
  signal: string
  reason: string
}

export interface SignalRecord {
  type: 'signal'
  id: string
  owner: string
  watchlistItem: string
  output: SignalOutput
  provider: string
  model: string
  createdAt: string
}

export type ZgRecord = SummaryRecord | SignalRecord

/**
 * Local index of records that live on 0G Storage. Holds only enough to
 * render a list row; opening any entry always re-reads the full record
 * from 0G Storage by root hash.
 */
export interface HistoryPointer {
  rootHash: string
  txHash: string
  type: 'summary' | 'signal'
  owner: string
  /** Watchlist item for signals; short source label for summaries. */
  title: string
  /** Signal text for signals; bottom line for summaries. */
  preview: string
  /** One-line reason, signals only. */
  detail?: string
  createdAt: string
}

export interface WatchlistItem {
  id: string
  label: string
  addedAt: string
}
