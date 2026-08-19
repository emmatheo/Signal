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
 * Pointer to a record on 0G Storage. Deliberately carries NO content —
 * only where the record lives and enough metadata to route it to the right
 * list. Every piece of text the UI displays is fetched from 0G Storage by
 * `rootHash`, so if 0G is unreachable there is nothing to render.
 *
 * Do not add content fields here. Caching summary or signal text locally
 * would let Signal display history that 0G Storage never returned.
 */
export interface HistoryPointer {
  rootHash: string
  txHash: string
  type: 'summary' | 'signal'
  createdAt: string
}

export interface WatchlistItem {
  id: string
  label: string
  addedAt: string
}
