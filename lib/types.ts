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

export interface HistoryPointer {
  rootHash: string
  txHash: string
  type: 'summary' | 'signal'
  owner: string
  preview: string
  createdAt: string
}

export interface WatchlistItem {
  id: string
  label: string
  addedAt: string
}
