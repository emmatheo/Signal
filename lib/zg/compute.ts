import {
  createZGComputeNetworkBroker,
  type ZGComputeNetworkBroker,
} from '@0gfoundation/0g-compute-ts-sdk'
import { getZgEnv } from './env'
import { getSigner } from './wallet'

export class ZgComputeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZgComputeError'
  }
}

/** 1 0G in neuron. Mirrors ZGServingUserBrokerBase.MIN_LOCKED_BALANCE. */
const MIN_LOCKED_BALANCE = 10n ** 18n

/**
 * Target locked balance in a provider sub-account, as a multiple of
 * MIN_LOCKED_BALANCE. The provider requires
 * `locked >= unsettledFee + currentFee + MIN_LOCKED_BALANCE`, so a bare 1x
 * leaves no headroom once any fee accrues. 2x matches the SDK's own
 * auto-funding default.
 */
const SUB_ACCOUNT_BUFFER = 2n

let brokerPromise: Promise<ZGComputeNetworkBroker> | null = null

async function getBroker(): Promise<ZGComputeNetworkBroker> {
  if (!brokerPromise) {
    brokerPromise = createZGComputeNetworkBroker(getSigner()).catch((err) => {
      brokerPromise = null
      throw new ZgComputeError(
        `Failed to initialize the 0G Compute broker: ${describe(err)}`
      )
    })
  }
  return brokerPromise
}

function describe(err: unknown): string {
  const e = err as { info?: { responseBody?: string }; shortMessage?: string; message?: string }
  const body = e?.info?.responseBody
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 300)
  return e?.shortMessage || e?.message || String(err)
}

/**
 * Distinguishes "the RPC is unreachable" from "this wallet has no ledger yet",
 * which otherwise surface identically and produce very misleading errors.
 */
async function rpcIsReachable(): Promise<boolean> {
  try {
    const signer = getSigner()
    await signer.provider!.getBlockNumber()
    return true
  } catch {
    return false
  }
}

async function ensureLedger(broker: ZGComputeNetworkBroker): Promise<void> {
  const env = getZgEnv()

  try {
    const ledger = await broker.ledger.getLedger()
    const available = ledger.availableBalance
    if (available < MIN_LOCKED_BALANCE / 2n) {
      try {
        await broker.ledger.depositFund(env.ledgerTopUpOG)
      } catch (err) {
        throw new ZgComputeError(
          `The 0G Compute ledger is low and the automatic top-up failed. Fund the ` +
            `signer wallet with more 0G and retry. Details: ${describe(err)}`
        )
      }
    }
    return
  } catch (err) {
    if (err instanceof ZgComputeError) throw err

    // getLedger() throws both when the RPC is down and when no ledger exists.
    // Only the second case should trigger ledger creation.
    if (!(await rpcIsReachable())) {
      throw new ZgComputeError(
        `Cannot reach the 0G Chain RPC (${env.evmRpc}). Check network access and ` +
          `ZG_EVM_RPC. Details: ${describe(err)}`
      )
    }
  }

  try {
    await broker.ledger.addLedger(env.ledgerInitialOG)
  } catch (err) {
    throw new ZgComputeError(
      `Could not open a 0G Compute ledger. This wallet needs at least 3 0G (the ` +
        `protocol minimum) plus gas. Fund the signer address and retry. ` +
        `Details: ${describe(err)}`
    )
  }
}

/**
 * Ensures the provider sub-account holds enough locked balance to serve
 * requests. The SDK does NOT do this inside getRequestHeaders — its own
 * comments point at `topUpAccountIfNeeded` / explicit `transferFund` — so
 * without this an otherwise correct request is rejected for insufficient funds.
 */
async function ensureSubAccount(
  broker: ZGComputeNetworkBroker,
  providerAddress: string
): Promise<void> {
  const required = SUB_ACCOUNT_BUFFER * MIN_LOCKED_BALANCE

  let deficit = required
  try {
    const account = await broker.inference.getAccount(providerAddress)
    const locked = account.balance - account.pendingRefund
    if (locked >= required) return
    deficit = required - locked
  } catch {
    // No sub-account yet — transferFund creates it.
  }

  // The SDK rejects dust transfers; never send less than the minimum.
  const amount = deficit < MIN_LOCKED_BALANCE ? MIN_LOCKED_BALANCE : deficit

  try {
    await broker.ledger.transferFund(providerAddress, 'inference', amount)
  } catch (err) {
    const msg = describe(err)
    if (msg.toLowerCase().includes('insufficient')) {
      throw new ZgComputeError(
        `Not enough balance in the 0G Compute ledger to fund provider ` +
          `${providerAddress}. Deposit more 0G into the ledger and retry. Details: ${msg}`
      )
    }
    throw new ZgComputeError(
      `Could not fund the provider sub-account for ${providerAddress}: ${msg}`
    )
  }
}

interface PreparedProvider {
  address: string
  endpoint: string
  model: string
}

let prepared: PreparedProvider | null = null

async function candidateProviders(broker: ZGComputeNetworkBroker): Promise<string[]> {
  const env = getZgEnv()
  if (env.providerAddress) return [env.providerAddress]

  let services
  try {
    services = await broker.inference.listService()
  } catch (err) {
    throw new ZgComputeError(`Could not list 0G Compute providers: ${describe(err)}`)
  }

  const usable = services.filter((s) => s.provider && s.url).map((s) => s.provider)
  if (usable.length === 0) {
    throw new ZgComputeError(
      'No 0G Compute inference providers are currently available. Try again shortly, ' +
        'or pin one with ZG_COMPUTE_PROVIDER_ADDRESS.'
    )
  }
  return usable
}

async function prepareProvider(
  broker: ZGComputeNetworkBroker,
  address: string
): Promise<PreparedProvider> {
  const acknowledged = await broker.inference.acknowledged(address).catch(() => false)
  if (!acknowledged) {
    try {
      await broker.inference.acknowledgeProviderSigner(address)
    } catch (err) {
      // Acknowledging twice reverts; only treat this as fatal if the provider
      // still isn't usable afterwards.
      const stillNot = await broker.inference.acknowledged(address).catch(() => false)
      if (!stillNot) {
        throw new ZgComputeError(
          `Could not acknowledge provider ${address}: ${describe(err)}`
        )
      }
    }
  }

  await ensureSubAccount(broker, address)

  const env = getZgEnv()
  const { endpoint, model } = await broker.inference.getServiceMetadata(address, env.model)
  return { address, endpoint, model }
}

export interface InferenceResult {
  content: string
  provider: string
  model: string
}

async function callProvider(
  broker: ZGComputeNetworkBroker,
  target: PreparedProvider,
  systemPrompt: string,
  userPrompt: string
): Promise<InferenceResult> {
  const body = {
    model: target.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }

  // Billing headers are single-use — always generated per request.
  const headers = await broker.inference.getRequestHeaders(target.address, userPrompt)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  let response: Response
  try {
    response = await fetch(`${target.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ZgComputeError(`0G Compute provider ${target.address} timed out after 45s.`)
    }
    throw new ZgComputeError(
      `Could not reach 0G Compute provider ${target.address}: ${describe(err)}`
    )
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 429) {
    throw new ZgComputeError(
      `0G Compute provider ${target.address} is rate-limiting requests. Try again shortly.`
    )
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new ZgComputeError(
      `0G Compute provider ${target.address} returned ${response.status}: ${text.slice(0, 300)}`
    )
  }

  const json = (await response.json()) as {
    id?: string
    choices?: { message?: { content?: string } }[]
    usage?: unknown
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new ZgComputeError(
      `0G Compute provider ${target.address} returned an empty completion.`
    )
  }

  const chatID = response.headers.get('ZG-Res-Key') || json.id
  if (chatID) {
    // Settlement/verification bookkeeping is best-effort: a failure here must
    // never discard an inference the user already paid for.
    broker.inference
      .processResponse(target.address, chatID, JSON.stringify(json.usage ?? {}))
      .catch(() => {})
  }

  return { content, provider: target.address, model: target.model }
}

/**
 * Runs one chat completion through real 0G Compute.
 *
 * Reuses the last known-good provider, and on failure re-selects and retries
 * against other providers before giving up — a single hard-coded provider is
 * a single point of failure in a marketplace where any node can go offline.
 */
export async function runInference(
  systemPrompt: string,
  userPrompt: string
): Promise<InferenceResult> {
  const broker = await getBroker()
  await ensureLedger(broker)

  const errors: string[] = []

  if (prepared) {
    try {
      return await callProvider(broker, prepared, systemPrompt, userPrompt)
    } catch (err) {
      errors.push(describe(err))
      prepared = null
    }
  }

  const candidates = await candidateProviders(broker)

  for (const address of candidates.slice(0, 3)) {
    try {
      const target = await prepareProvider(broker, address)
      const result = await callProvider(broker, target, systemPrompt, userPrompt)
      prepared = target
      return result
    } catch (err) {
      errors.push(describe(err))
    }
  }

  throw new ZgComputeError(
    `All 0G Compute providers tried failed. ${errors.slice(0, 3).join(' | ')}`
  )
}
