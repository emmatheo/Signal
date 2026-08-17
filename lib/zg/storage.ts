import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk'
import { getZgEnv } from './env'
import { getSigner } from './wallet'

export class ZgStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZgStorageError'
  }
}

let indexer: Indexer | null = null

function getIndexer(): Indexer {
  if (!indexer) {
    indexer = new Indexer(getZgEnv().indexerRpc)
  }
  return indexer
}

function describe(err: unknown): string {
  const e = err as { info?: { responseBody?: string }; shortMessage?: string; message?: string }
  const body = e?.info?.responseBody
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 300)
  return e?.shortMessage || e?.message || String(err)
}

export const ROOT_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/

export interface UploadResult {
  rootHash: string
  txHash: string
}

/**
 * Serializes `data` to JSON and uploads it to real 0G Storage.
 * Returns the content-addressed root hash and the on-chain submission tx.
 *
 * `finalityRequired: false` is deliberate: waiting for full cross-node
 * replication routinely exceeds a serverless function's request budget. The
 * upload is still a real on-chain submission — the rootHash and txHash below
 * are verifiable — we simply don't block the HTTP response on propagation.
 * downloadJson() retries to absorb that lag.
 */
export async function uploadJson(data: unknown): Promise<UploadResult> {
  const env = getZgEnv()
  const signer = getSigner()
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  const file = new MemData(bytes)

  let result, err
  try {
    ;[result, err] = await getIndexer().upload(file, env.evmRpc, signer, {
      finalityRequired: false,
    })
  } catch (thrown) {
    // The SDK contract is [value, error], but transport-level faults can still
    // throw outright — don't let those surface as an unhandled 500.
    throw new ZgStorageError(`0G Storage upload failed: ${describe(thrown)}`)
  }

  if (err !== null) {
    throw new ZgStorageError(`0G Storage upload failed: ${describe(err)}`)
  }

  const rootHash = 'rootHash' in result ? result.rootHash : result.rootHashes?.[0]
  const txHash = 'txHash' in result ? result.txHash : result.txHashes?.[0]

  if (!rootHash || !txHash) {
    throw new ZgStorageError(
      '0G Storage upload returned no root hash — the record was not stored.'
    )
  }

  return { rootHash, txHash }
}

const RETRY_DELAYS_MS = [500, 1500, 3000, 5000, 8000]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Downloads and JSON-parses a record written by uploadJson().
 *
 * Retries with backoff: because uploads don't wait for finality, a read
 * issued moments after a write can legitimately miss until the data
 * propagates to storage nodes.
 */
export async function downloadJson<T>(rootHash: string): Promise<T> {
  if (!ROOT_HASH_PATTERN.test(rootHash)) {
    throw new ZgStorageError(`"${rootHash}" is not a valid 0G Storage root hash.`)
  }

  const idx = getIndexer()
  let lastErr: unknown = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let blob, err
    try {
      ;[blob, err] = await idx.downloadToBlob(rootHash)
    } catch (thrown) {
      err = thrown as Error
    }

    if (!err && blob) {
      const text = await blob.text()
      try {
        return JSON.parse(text) as T
      } catch (parseErr) {
        // Reached 0G Storage and got bytes back, but they aren't ours — retrying
        // won't help, so fail immediately with a distinct message.
        throw new ZgStorageError(
          `Record ${rootHash} was downloaded from 0G Storage but is not valid JSON: ${
            (parseErr as Error).message
          }`
        )
      }
    }

    lastErr = err
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }

  throw new ZgStorageError(
    `Could not read ${rootHash} from 0G Storage after ${RETRY_DELAYS_MS.length + 1} ` +
      `attempts. If this record was just created, it may still be propagating — ` +
      `retry shortly. Details: ${describe(lastErr)}`
  )
}
