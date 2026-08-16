import {
  createZGComputeNetworkBroker,
  type ZGComputeNetworkBroker,
} from '@0gfoundation/0g-compute-ts-sdk'
import { ethers } from 'ethers'
import { getZgEnv } from './env'
import { getSigner } from './wallet'

export class ZgComputeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZgComputeError'
  }
}

let brokerPromise: Promise<ZGComputeNetworkBroker> | null = null
let readyPromise: Promise<ReadyProvider> | null = null

interface ReadyProvider {
  address: string
  endpoint: string
  model: string
}

async function getBroker(): Promise<ZGComputeNetworkBroker> {
  if (!brokerPromise) {
    brokerPromise = createZGComputeNetworkBroker(getSigner()).catch((err) => {
      brokerPromise = null
      throw new ZgComputeError(`Failed to initialize 0G Compute broker: ${err.message || err}`)
    })
  }
  return brokerPromise
}

async function ensureLedger(broker: ZGComputeNetworkBroker) {
  const env = getZgEnv()

  let availableBalance: bigint
  try {
    const ledger = await broker.ledger.getLedger()
    availableBalance = ledger.availableBalance
  } catch {
    // No ledger for this wallet yet — open one.
    try {
      await broker.ledger.addLedger(env.ledgerInitialOG)
    } catch (err) {
      throw new ZgComputeError(
        `Could not open a 0G Compute ledger. This wallet needs at least 3 0G testnet ` +
          `tokens (the protocol minimum) to open one. Fund the signer address from ` +
          `https://faucet.0g.ai and try again. Underlying error: ${
            (err as Error).message || err
          }`
      )
    }
    return
  }

  const minBalance = ethers.parseEther(env.ledgerMinBalanceOG.toString())
  if (availableBalance < minBalance) {
    try {
      await broker.ledger.depositFund(env.ledgerTopUpOG)
    } catch (err) {
      throw new ZgComputeError(
        `0G Compute ledger balance is low and auto top-up failed. Fund the signer wallet ` +
          `with more 0G testnet tokens from https://faucet.0g.ai. Underlying error: ${
            (err as Error).message || err
          }`
      )
    }
  }
}

async function selectProvider(broker: ZGComputeNetworkBroker): Promise<string> {
  const env = getZgEnv()
  if (env.providerAddress) return env.providerAddress

  const services = await broker.inference.listService()
  const withUrl = services.filter((s) => s.provider && s.url)
  if (withUrl.length === 0) {
    throw new ZgComputeError(
      '0G Compute returned no available inference providers. Try again shortly, or set ' +
        'ZG_COMPUTE_PROVIDER_ADDRESS to pin a known provider.'
    )
  }
  return withUrl[0].provider
}

async function ensureReady(): Promise<ReadyProvider> {
  if (!readyPromise) {
    readyPromise = (async () => {
      const broker = await getBroker()
      await ensureLedger(broker)

      const providerAddress = await selectProvider(broker)

      const acknowledged = await broker.inference.acknowledged(providerAddress).catch(() => false)
      if (!acknowledged) {
        await broker.inference.acknowledgeProviderSigner(providerAddress)
      }

      const env = getZgEnv()
      const { endpoint, model } = await broker.inference.getServiceMetadata(
        providerAddress,
        env.model
      )

      return { address: providerAddress, endpoint, model }
    })().catch((err) => {
      readyPromise = null
      throw err
    })
  }
  return readyPromise
}

export interface InferenceResult {
  content: string
  provider: string
  model: string
}

/**
 * Sends a single-turn chat completion through real 0G Compute and returns
 * the raw text response. Billing headers are generated fresh per request
 * (they are single-use) and settlement/verification bookkeeping is done
 * best-effort after the response is already in hand — a bookkeeping
 * failure never hides a successful inference result from the caller.
 */
export async function runInference(
  systemPrompt: string,
  userPrompt: string
): Promise<InferenceResult> {
  const broker = await getBroker()
  const { address, endpoint, model } = await ensureReady()

  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }

  const headers = await broker.inference.getRequestHeaders(address, userPrompt)

  let response: Response
  try {
    response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(requestBody),
    })
  } catch (err) {
    throw new ZgComputeError(
      `Could not reach 0G Compute provider ${address}: ${(err as Error).message || err}`
    )
  }

  if (response.status === 429) {
    throw new ZgComputeError('0G Compute provider is rate-limiting requests. Try again shortly.')
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new ZgComputeError(
      `0G Compute provider returned ${response.status}: ${body.slice(0, 500)}`
    )
  }

  const json = (await response.json()) as {
    id?: string
    choices?: { message?: { content?: string } }[]
    usage?: unknown
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new ZgComputeError('0G Compute provider returned an empty completion.')
  }

  const chatID = response.headers.get('ZG-Res-Key') || json.id
  if (chatID) {
    broker.inference
      .processResponse(address, chatID, JSON.stringify(json.usage ?? {}))
      .catch(() => {
        // Best-effort settlement/verification bookkeeping — never fail the
        // user-facing request because of it.
      })
  }

  return { content, provider: address, model }
}
