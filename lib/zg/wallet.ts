import { ethers } from 'ethers'
import { getZgEnv } from './env'

let provider: ethers.JsonRpcProvider | null = null
let wallet: ethers.Wallet | null = null

/**
 * Single server-held signer that pays for and signs every 0G Storage
 * upload and every 0G Compute payment. Signal has no wallet-connect flow;
 * "ownership" of a piece of research is expressed by the `owner` tag baked
 * into the record content (see lib/client/local-store.ts), not by having
 * the end user hold the signing key. See README for the rationale.
 */
export function getSigner(): ethers.Wallet {
  const env = getZgEnv()
  if (!provider) {
    provider = new ethers.JsonRpcProvider(env.evmRpc)
  }
  if (!wallet) {
    wallet = new ethers.Wallet(env.privateKey, provider)
  }
  return wallet
}
