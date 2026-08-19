import { FixedPriceFlow__factory } from '@0gfoundation/0g-storage-ts-sdk'
import { ethers } from 'ethers'
import { getSigner } from './wallet'

export class ZgResolveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZgResolveError'
  }
}

export const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/

const flowInterface = new ethers.Interface(FixedPriceFlow__factory.abi)

/**
 * Resolves a 0G Chain transaction hash to the storage root hash(es) it
 * submitted, by decoding the Flow contract's `Submit` events from the receipt.
 *
 * A submission's file root equals `nodes[0].root` only when the submission has
 * a single node — verified empirically across payload sizes. Multi-node
 * submissions (large files) need the full node tree to derive the file root,
 * so rather than return a plausible-but-wrong hash we report that the storage
 * root must be supplied directly. Signal's own records are small JSON and
 * always land in the single-node case.
 */
export interface ParsedSubmissions {
  roots: string[]
  /** Submissions whose root cannot be derived from the receipt alone. */
  multiNode: number
}

/**
 * Pure log-parsing half of the resolver, split out so it can be exercised
 * without a chain connection.
 */
export function rootHashesFromLogs(
  logs: readonly { topics: readonly string[]; data: string }[]
): ParsedSubmissions {
  const roots: string[] = []
  let multiNode = 0

  for (const log of logs) {
    let parsed: ethers.LogDescription | null = null
    try {
      parsed = flowInterface.parseLog({ topics: [...log.topics], data: log.data })
    } catch {
      continue // not a Flow contract event
    }
    if (!parsed || parsed.name !== 'Submit') continue

    const nodes = parsed.args?.submission?.nodes
    if (!nodes || nodes.length === 0) continue

    if (nodes.length === 1) {
      roots.push(nodes[0].root)
    } else {
      multiNode++
    }
  }

  return { roots, multiNode }
}

export async function rootHashesFromTx(txHash: string): Promise<string[]> {
  const signer = getSigner()
  const provider = signer.provider
  if (!provider) throw new ZgResolveError('No 0G Chain provider configured.')

  let receipt: ethers.TransactionReceipt | null
  try {
    receipt = await provider.getTransactionReceipt(txHash)
  } catch (err) {
    throw new ZgResolveError(
      `Could not read transaction ${txHash} from 0G Chain: ${
        (err as Error).message || String(err)
      }`
    )
  }

  if (!receipt) return []

  const { roots, multiNode } = rootHashesFromLogs(receipt.logs)

  if (roots.length === 0 && multiNode > 0) {
    throw new ZgResolveError(
      `Transaction ${txHash} stored a multi-part file, whose storage root cannot be ` +
        `derived from the transaction alone. Paste the storage root hash instead.`
    )
  }

  return roots
}
