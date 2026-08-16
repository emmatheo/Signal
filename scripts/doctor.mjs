#!/usr/bin/env node
/**
 * Signal — 0G configuration doctor.
 *
 *   node scripts/doctor.mjs          read-only checks (spends nothing)
 *   node scripts/doctor.mjs --full   also runs one real inference and one
 *                                    real storage upload+download round-trip
 *                                    (spends a small amount of testnet 0G)
 *
 * Verifies, in order: env vars -> chain RPC -> wallet balance -> storage
 * indexer -> compute providers -> compute ledger -> (with --full) a real
 * end-to-end inference and storage round-trip.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Minimal .env loader so this script behaves like `next dev` does.
for (const file of ['.env.local', '.env']) {
  const path = resolve(root, file)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line)
    if (!match) continue
    const key = match[1]
    if (process.env[key] !== undefined) continue
    let value = (match[2] || '').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

const FULL = process.argv.includes('--full')

const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}
const ok = (m, extra) => console.log(`${c.green}✓${c.reset} ${m}${extra ? ` ${c.dim}${extra}${c.reset}` : ''}`)
const bad = (m, extra) => console.log(`${c.red}✗${c.reset} ${m}${extra ? `\n  ${c.dim}${extra}${c.reset}` : ''}`)
const info = (m) => console.log(`${c.dim}  ${m}${c.reset}`)
const head = (m) => console.log(`\n${c.cyan}${m}${c.reset}`)

let failed = false
function fail(msg, detail) {
  bad(msg, detail)
  failed = true
}

/**
 * ethers wraps HTTP failures, so the useful text (e.g. an egress proxy's
 * "Host not in allowlist") ends up in err.info.responseBody rather than
 * err.message. Surface whichever is most specific.
 */
function reason(err) {
  const body = err?.info?.responseBody
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 300)
  return err?.shortMessage || err?.message || String(err)
}

const { ethers } = await import('ethers')
const { Indexer, MemData } = await import('@0gfoundation/0g-storage-ts-sdk')
const { createZGComputeNetworkBroker } = await import('@0gfoundation/0g-compute-ts-sdk')

// ---------------------------------------------------------------- env
head('1. Environment')

const privateKey = process.env.ZG_PRIVATE_KEY?.trim()
const evmRpc = process.env.ZG_EVM_RPC?.trim() || 'https://evmrpc-testnet.0g.ai'
const indexerRpc =
  process.env.ZG_INDEXER_RPC?.trim() || 'https://indexer-storage-testnet-turbo.0g.ai'
const pinnedProvider = process.env.ZG_COMPUTE_PROVIDER_ADDRESS?.trim()

if (!privateKey) {
  fail(
    'ZG_PRIVATE_KEY is not set.',
    'Create .env.local (copy .env.example) and set ZG_PRIVATE_KEY to a funded testnet wallet.'
  )
  console.log('\nCannot continue without a signer.')
  process.exit(1)
}

let wallet
try {
  wallet = new ethers.Wallet(privateKey)
  ok('ZG_PRIVATE_KEY parsed', wallet.address)
} catch {
  fail('ZG_PRIVATE_KEY is not a valid private key.')
  process.exit(1)
}
ok('EVM RPC', evmRpc)
ok('Storage indexer', indexerRpc)
if (pinnedProvider) ok('Compute provider pinned', pinnedProvider)

// ---------------------------------------------------------------- chain
head('2. 0G Chain')

let provider, signer
try {
  provider = new ethers.JsonRpcProvider(evmRpc)
  const [net, block] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()])
  signer = wallet.connect(provider)
  ok('RPC reachable', `chainId ${net.chainId} · block ${block}`)
  if (net.chainId !== 16602n && net.chainId !== 16661n) {
    info(`Note: chainId ${net.chainId} is neither 0G testnet (16602) nor mainnet (16661).`)
  }
} catch (err) {
  fail('Could not reach the 0G EVM RPC.', reason(err))
  info('If this says "Host not in allowlist", your network egress policy is blocking 0g.ai.')
  process.exit(1)
}

let balance = 0n
try {
  balance = await provider.getBalance(wallet.address)
  const eth = Number(ethers.formatEther(balance))
  if (eth === 0) {
    fail(`Wallet has no 0G. Fund ${wallet.address} from the 0G faucet.`)
  } else if (eth < 3) {
    bad(`Wallet balance is ${eth} 0G — below the 3 0G needed to open a Compute ledger.`)
    info(`Fund ${wallet.address} from the 0G faucet before running --full.`)
  } else {
    ok('Wallet funded', `${eth} 0G`)
  }
} catch (err) {
  fail('Could not read wallet balance.', reason(err))
}

// ---------------------------------------------------------------- storage
head('3. 0G Storage')

const indexer = new Indexer(indexerRpc)
try {
  const nodes = await indexer.getShardedNodes()
  const trusted = nodes?.trusted?.length ?? 0
  const discovered = nodes?.discovered?.length ?? 0
  if (trusted === 0 && discovered === 0) {
    fail('Storage indexer returned no nodes.')
  } else {
    ok('Indexer reachable', `${trusted} trusted · ${discovered} discovered nodes`)
  }
} catch (err) {
  fail('Could not reach the 0G Storage indexer.', reason(err))
}

// ---------------------------------------------------------------- compute
head('4. 0G Compute')

let broker
try {
  broker = await createZGComputeNetworkBroker(signer)
  ok('Broker initialized')
} catch (err) {
  fail('Could not initialize the 0G Compute broker.', reason(err))
}

let chosenProvider = pinnedProvider
if (broker) {
  try {
    const services = await broker.inference.listService()
    const usable = services.filter((s) => s.provider && s.url)
    if (usable.length === 0) {
      fail('No inference providers are currently available.')
    } else {
      ok(`Providers available`, `${usable.length} listed`)
      for (const s of usable.slice(0, 5)) {
        info(`${s.provider}  ${s.model || '(default model)'}`)
      }
      if (!chosenProvider) chosenProvider = usable[0].provider
    }
  } catch (err) {
    fail('Could not list inference providers.', reason(err))
  }

  try {
    const ledger = await broker.ledger.getLedger()
    ok('Compute ledger exists', `${ethers.formatEther(ledger.availableBalance)} 0G available`)
  } catch {
    bad('No Compute ledger for this wallet yet.')
    info('Signal opens one automatically on first use (needs >= 3 0G).')
    info('Run with --full to open it now and verify the whole path.')
  }
}

// ---------------------------------------------------------------- full
if (FULL && broker && chosenProvider) {
  head('5. End-to-end (spends testnet funds)')

  try {
    try {
      await broker.ledger.getLedger()
    } catch {
      info('Opening Compute ledger…')
      await broker.ledger.addLedger(Number(process.env.ZG_LEDGER_INITIAL_OG || 3.5))
      ok('Ledger opened')
    }

    const acknowledged = await broker.inference.acknowledged(chosenProvider).catch(() => false)
    if (!acknowledged) {
      info('Acknowledging provider…')
      await broker.inference.acknowledgeProviderSigner(chosenProvider)
    }
    ok('Provider acknowledged', chosenProvider)

    const { endpoint, model } = await broker.inference.getServiceMetadata(
      chosenProvider,
      process.env.ZG_COMPUTE_MODEL?.trim() || undefined
    )
    ok('Service metadata', `${model} @ ${endpoint}`)

    const prompt = 'Reply with exactly the word: ok'
    const headers = await broker.inference.getRequestHeaders(chosenProvider, prompt)
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) {
      fail(`Inference failed (${res.status})`, (await res.text()).slice(0, 300))
    } else {
      const json = await res.json()
      const content = json.choices?.[0]?.message?.content
      ok('Inference succeeded', JSON.stringify(content?.slice(0, 60)))
      const chatID = res.headers.get('ZG-Res-Key') || json.id
      if (chatID) {
        await broker.inference
          .processResponse(chosenProvider, chatID, JSON.stringify(json.usage ?? {}))
          .catch(() => {})
      }
    }
  } catch (err) {
    fail('Compute end-to-end failed.', reason(err))
  }

  try {
    const payload = { probe: 'signal-doctor', at: new Date().toISOString() }
    const file = new MemData(new TextEncoder().encode(JSON.stringify(payload)))
    info('Uploading a probe record to 0G Storage…')
    const [result, err] = await indexer.upload(file, evmRpc, signer, { finalityRequired: false })
    if (err !== null) throw err

    const rootHash = 'rootHash' in result ? result.rootHash : result.rootHashes[0]
    const txHash = 'txHash' in result ? result.txHash : result.txHashes[0]
    ok('Upload succeeded')
    info(`root hash ${rootHash}`)
    info(`tx        ${txHash}`)

    info('Reading it back…')
    let recovered = null
    for (const delay of [1000, 2000, 4000, 6000, 8000]) {
      const [blob, dErr] = await indexer.downloadToBlob(rootHash)
      if (dErr === null && blob) {
        recovered = JSON.parse(await blob.text())
        break
      }
      await new Promise((r) => setTimeout(r, delay))
    }
    if (recovered?.probe === 'signal-doctor') {
      ok('Download verified — round-trip works')
    } else {
      fail('Uploaded, but could not read the record back yet.')
      info('Storage propagation can lag; retry the doctor in a minute.')
    }
  } catch (err) {
    fail('Storage end-to-end failed.', reason(err))
  }
}

// ---------------------------------------------------------------- summary
console.log()
if (failed) {
  console.log(`${c.red}Some checks failed.${c.reset} Signal will show errors until they pass.`)
  process.exit(1)
}
if (!FULL) {
  console.log(`${c.green}Read-only checks passed.${c.reset} Run with ${c.cyan}--full${c.reset} to verify a real inference + storage round-trip.`)
} else {
  console.log(`${c.green}All checks passed — Signal is configured against live 0G.${c.reset}`)
}
