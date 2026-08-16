export class ZgConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZgConfigError'
  }
}

function num(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (Number.isNaN(parsed)) {
    throw new ZgConfigError(`Environment variable ${name} must be a number, got "${raw}".`)
  }
  return parsed
}

export function getZgEnv() {
  const privateKey = process.env.ZG_PRIVATE_KEY?.trim()
  if (!privateKey) {
    throw new ZgConfigError(
      'ZG_PRIVATE_KEY is not set. Signal needs a funded 0G wallet on the server to sign ' +
        'storage uploads and compute payments. Set ZG_PRIVATE_KEY in your environment ' +
        '(see .env.example) and fund the corresponding address from https://faucet.0g.ai'
    )
  }

  return {
    privateKey,
    evmRpc: process.env.ZG_EVM_RPC?.trim() || 'https://evmrpc-testnet.0g.ai',
    indexerRpc:
      process.env.ZG_INDEXER_RPC?.trim() || 'https://indexer-storage-testnet-turbo.0g.ai',
    providerAddress: process.env.ZG_COMPUTE_PROVIDER_ADDRESS?.trim() || undefined,
    model: process.env.ZG_COMPUTE_MODEL?.trim() || undefined,
    ledgerInitialOG: num('ZG_LEDGER_INITIAL_OG', 3.5),
    ledgerMinBalanceOG: num('ZG_LEDGER_MIN_BALANCE_OG', 0.5),
    ledgerTopUpOG: num('ZG_LEDGER_TOPUP_OG', 1),
  }
}
