# 0G Stack — Study Notes

Verified against the **actually published SDK packages** (type declarations + shipped JS),
not from memory. `docs.0g.ai` is blocked by this environment's egress proxy, so the
authoritative source used here is the npm registry + the SDKs' own `.d.ts` files.

## 1. The three layers

| Layer | What it is | Independently usable |
|---|---|---|
| **0G Chain** | EVM-compatible L1. Testnet "Galileo" chainId **16602**, mainnet **16661**. Settlement + payment rail for the other layers. | Yes |
| **0G Storage** | Decentralized, persistent, user-owned data. Content-addressed by **Merkle root hash**. Log layer (files) + KV layer (streams). | Yes |
| **0G Compute** | Decentralized GPU marketplace. Providers expose **OpenAI-API-compatible** inference endpoints; billing settled on 0G Chain via a broker. | Yes |

Modular: Storage and Compute are separate SDKs and separate contracts. Either can be
used alone. Both use 0G Chain only for payment/settlement.

## 2. Packages — note the rename

The `@0glabs/*` scope is legacy. Current packages are `@0gfoundation/*`.

```
npm i @0gfoundation/0g-storage-ts-sdk   # v1.2.11 — Storage
npm i @0gfoundation/0g-compute-ts-sdk   # v0.9.0  — Compute
npm i ethers@6.13.1                      # peer dep, pinned by storage SDK
```

- `@0glabs/0g-ts-sdk` (0.3.3) is the old storage package.
- `@0glabs/0g-serving-broker` (0.7.8) is **explicitly marked DEPRECATED** in its npm
  description — it is a re-export shim for `@0gfoundation/0g-compute-ts-sdk`.

## 3. Network endpoints (extracted from shipped SDK JS)

| Purpose | Testnet | Mainnet |
|---|---|---|
| EVM RPC | `https://evmrpc-testnet.0g.ai` | `https://evmrpc.0g.ai` |
| Storage indexer (turbo) | `https://indexer-storage-testnet-turbo.0g.ai` | `https://indexer-storage-turbo.0g.ai` |
| Storage indexer (standard) | `https://indexer-storage-testnet-standard.0g.ai` | `https://indexer-storage-standard.0g.ai` |
| Compute status/health API | `https://compute-status-testnet.0g.ai` | `https://compute-status.0g.ai` |

Turbo and standard are **different networks** — a root hash uploaded to one is not
retrievable from the other. Pick one and stay on it.

### Compute contract addresses (from `constants.d.ts`)

| | testnet | mainnet |
|---|---|---|
| ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` | `0x2dE54c845Cd948B72D2e32e39586fe89607074E3` |
| inference | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` | `0x47340d900bdFec2BD393c626E12ea0656F938d84` |
| fineTuning | `0xC6C075D8039763C8f1EbE580be5ADdf2fd6941bA` | `0x4e3474095518883744ddf135b7E0A23301c7F9c0` |

These are auto-detected from the signer's provider — do not hardcode unless overriding.

## 4. Storage: upload / retrieve

Key detail: **the SDK returns `[result, error]` tuples, it does not throw.** Every call
site must check the error element.

```ts
import { Indexer, ZgFile, MemData } from '@0gfoundation/0g-storage-ts-sdk'
import { ethers } from 'ethers'

const provider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai')
const signer   = new ethers.Wallet(PRIVATE_KEY, provider)
const indexer  = new Indexer('https://indexer-storage-testnet-turbo.0g.ai')

// File sources, all extend AbstractFile:
//   ZgFile.fromFilePath(path)      -> Node.js, from disk
//   new MemData(bytes)             -> in-memory buffer (JSON, blobs we build)
//   new Blob(file)                 -> browser File object
const file = new MemData(new TextEncoder().encode(JSON.stringify(payload)))

// Content address is available BEFORE upload:
const [tree, treeErr] = await file.merkleTree()
const rootHash = tree?.rootHash()

const [res, err] = await indexer.upload(file, EVM_RPC, signer, {
  tags, submitter, finalityRequired, expectedReplica, fragmentSize,
  skipTx, skipIfFinalized, fee, nonce,
  onProgress: (m) => console.log(m),
  encryption: { type: 'aes256', key } // or { type: 'ecies', recipientPubKey }
})
if (err !== null) throw err
// res is { txHash, rootHash, txSeq }  OR  { txHashes[], rootHashes[], txSeqs[] }
// (the plural form when the file was fragmented — handle both)
```

Retrieval is by root hash:

```ts
// Node.js only (uses fs):
const err = await indexer.download(rootHash, '/out/path', /* proof */ true)

// Browser + Node safe — returns a Blob:
const [blob, err] = await indexer.downloadToBlob(rootHash, {
  proof: true,
  decryption: { symmetricKey } // or { privateKey } for ecies
})

// Check if a file is encrypted without downloading it:
const [header, err] = await indexer.peekHeader(rootHash)
```

Other surface worth knowing: `indexer.getShardedNodes()`, `getFileLocations(rootHash)`,
`selectNodes(replica, method)`, `uploadToHot(...)` (upload + hot-cache prefetch),
and the KV layer (`Batcher`, `KvClient`, `StreamDataBuilder`) for mutable
stream/key-value data rather than immutable files.

Encryption is built in (AES-256-CTR symmetric, or ECIES to a recipient pubkey) —
no need to roll our own for user-owned private data.

## 5. Compute: running inference

The billing model: fund a **ledger** once, the ledger fans out into per-provider
sub-accounts. Each request carries signed billing headers that double as a settlement
proof for the provider.

```ts
import { createZGComputeNetworkBroker } from '@0gfoundation/0g-compute-ts-sdk'
import OpenAI from 'openai'

const broker = await createZGComputeNetworkBroker(signer) // addresses auto-detected

// One-time funding (units are 0G):
await broker.ledger.addLedger(0.1)
await broker.ledger.depositFund(0.05)

// Discover providers (this also works with NO wallet, via
// createZGComputeNetworkReadOnlyBroker(rpcUrl) — good for a browse-before-connect UI)
const services = await broker.inference.listService()
// or listServiceWithDetail() for uptime / avgResponseTime health metrics

// Resolve endpoint + model for a chosen provider
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress)

// Per-request signed billing headers — SINGLE USE, regenerate for every request
const headers = await broker.inference.getRequestHeaders(providerAddress, content)

const openai = new OpenAI({ baseURL: endpoint, apiKey: '' })
const completion = await openai.chat.completions.create(
  { messages: [{ role: 'user', content }], model },
  { headers: { ...headers } }
)

// Settle + (for TEE-verifiable services) verify the response signature
const chatID = response.headers.get('ZG-Res-Key') || completion.id
await broker.inference.processResponse(providerAddress, chatID, usageJson)
```

Notes that matter for building:
- It is **OpenAI-compatible**, so the standard `openai` npm client works — 0G supplies
  `baseURL` + per-request headers rather than an API key.
- `broker.inference.startAutoFunding(provider, { interval, bufferMultiplier })` keeps the
  sub-account topped up in the background so `getRequestHeaders` stays zero-latency.
  Pair with `stopAutoFunding()`.
- `verifyService(provider)` / `getSignerRaDownloadLink()` expose TEE attestation for
  verifiable providers. `service.verifiability` on the listing says whether a provider
  offers it.
- Multi-model providers: `getProviderModels(provider)` lists ids; pass one as the second
  arg to `getServiceMetadata(provider, model)`.
- Prices (`inputPrice`/`outputPrice`) are in **neuron**, the smallest unit.
- LoRA/fine-tuned models are reachable via `deployAdapter` + `chatWithFineTunedModel`.

## 6. Gotchas to respect when building

1. Storage SDK returns `[value, error]` tuples — never `try/catch` alone.
2. `indexer.upload` result is a union (single vs. fragmented) — narrow it.
3. Turbo vs. standard indexers are distinct networks.
4. Use `@0gfoundation/*`, not the deprecated `@0glabs/*` scope.
5. `ethers` is pinned to `6.13.1` as a storage peer dep.
6. `download`/`ZgFile.fromFilePath` are Node-only; use `downloadToBlob`/`Blob` in browser.
7. Billing headers are per-request and single-use.
8. Never ship a private key to the browser — signing that spends funds belongs server-side.
