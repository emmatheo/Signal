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

export interface UploadResult {
  rootHash: string
  txHash: string
}

/**
 * Serializes `data` to JSON and uploads it to real 0G Storage.
 * Returns the content-addressed root hash and the on-chain submission tx.
 *
 * `finalityRequired: false` is used deliberately: waiting for full
 * cross-node replication can take longer than a typical serverless
 * function's request budget. The upload itself is still a real, verifiable
 * on-chain submission (rootHash + txHash below can be checked against a
 * 0G explorer) — we just don't block the HTTP response on full network
 * propagation. downloadJson() below retries to absorb that propagation lag.
 */
export async function uploadJson(data: unknown): Promise<UploadResult> {
  const env = getZgEnv()
  const signer = getSigner()
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  const file = new MemData(bytes)

  const [result, err] = await getIndexer().upload(file, env.evmRpc, signer, {
    finalityRequired: false,
  })

  if (err !== null) {
    throw new ZgStorageError(`0G Storage upload failed: ${err.message || String(err)}`)
  }

  if ('rootHashes' in result) {
    const rootHash = result.rootHashes[0]
    const txHash = result.txHashes[0]
    if (!rootHash || !txHash) {
      throw new ZgStorageError('0G Storage upload returned no root hash.')
    }
    return { rootHash, txHash }
  }

  return { rootHash: result.rootHash, txHash: result.txHash }
}

const RETRY_DELAYS_MS = [500, 1500, 3000, 5000, 8000]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Downloads and JSON-parses a record previously written by uploadJson().
 * Retries with backoff because uploads don't wait for full finality
 * (see uploadJson) — a download attempted immediately after upload can
 * transiently 404 until the data finishes propagating to storage nodes.
 */
export async function downloadJson<T>(rootHash: string): Promise<T> {
  const idx = getIndexer()
  let lastErr: unknown = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const [blob, err] = await idx.downloadToBlob(rootHash)
    if (err === null && blob) {
      const text = await blob.text()
      try {
        return JSON.parse(text) as T
      } catch (parseErr) {
        throw new ZgStorageError(
          `Downloaded data for ${rootHash} from 0G Storage but it was not valid JSON: ${
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
    `0G Storage download failed for root hash ${rootHash}: ${
      (lastErr as Error)?.message || String(lastErr)
    }`
  )
}
