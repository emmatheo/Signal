import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const FETCH_TIMEOUT_MS = 10_000
const MAX_BYTES = 512 * 1024
const MAX_TEXT_CHARS = 8_000
const MAX_REDIRECTS = 3

export interface FetchedSource {
  /** Text to hand the model: page text when available, else the raw input. */
  text: string
  /** True only if we actually retrieved and extracted page content. */
  fetched: boolean
  /** Human-readable reason when fetching was skipped or failed. */
  note?: string
}

/**
 * Blocks loopback, private, link-local, and unique-local ranges so a pasted
 * URL can't be used to probe internal services from the server (SSRF).
 */
function isPrivateAddress(ip: string): boolean {
  if (ip === '::1' || ip === '::' || ip.startsWith('fc') || ip.startsWith('fd')) return true
  if (ip.startsWith('fe80:')) return true

  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  const parts = v4.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false

  const [a, b] = parts
  if (a === 0 || a === 127) return true
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

async function assertPublicHost(hostname: string): Promise<void> {
  const literal = isIP(hostname)
  if (literal) {
    if (isPrivateAddress(hostname)) throw new Error('refusing to fetch a private address')
    return
  }

  const lowered = hostname.toLowerCase()
  if (lowered === 'localhost' || lowered.endsWith('.localhost') || lowered.endsWith('.internal')) {
    throw new Error('refusing to fetch a local hostname')
  }

  const resolved = await lookup(hostname, { all: true })
  if (resolved.length === 0) throw new Error('hostname did not resolve')
  for (const { address } of resolved) {
    if (isPrivateAddress(address)) throw new Error('hostname resolves to a private address')
  }
}

/** Very small HTML-to-text pass. Good enough to give the model real content. */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''

  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.byteLength
  }
  await reader.cancel().catch(() => {})

  const buffer = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    const room = Math.min(chunk.byteLength, total - offset)
    buffer.set(chunk.subarray(0, room), offset)
    offset += room
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

/**
 * Fetches an http(s) URL server-side so the model receives page text rather
 * than a bare link. Never throws: on any failure it falls back to the raw
 * input with an explanatory note, so summarization still proceeds.
 */
export async function fetchSourceText(raw: string): Promise<FetchedSource> {
  const trimmed = raw.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return { text: trimmed, fetched: false }
  }

  let current = trimmed
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = new URL(current)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('unsupported protocol')
      }
      await assertPublicHost(url.hostname)

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      let response: Response
      try {
        response = await fetch(url, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            // Some sites return an error page to an unknown agent.
            'User-Agent': 'Mozilla/5.0 (compatible; SignalResearchBot/1.0)',
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
          },
        })
      } finally {
        clearTimeout(timer)
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw new Error(`redirect with no location (${response.status})`)
        // Re-validated against SSRF rules on the next loop iteration.
        current = new URL(location, url).toString()
        continue
      }

      if (!response.ok) {
        throw new Error(`server responded ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!/text\/html|text\/plain|application\/(xhtml\+xml|json)/i.test(contentType)) {
        throw new Error(`unsupported content type "${contentType.split(';')[0] || 'unknown'}"`)
      }

      const body = await readCapped(response)
      const text = /html|xml/i.test(contentType) ? htmlToText(body) : body.trim()

      if (text.length < 200) {
        throw new Error('page returned too little readable text')
      }

      const clipped = text.slice(0, MAX_TEXT_CHARS)
      return {
        fetched: true,
        text:
          `URL: ${trimmed}\n\n` +
          `Page content${clipped.length < text.length ? ' (truncated)' : ''}:\n${clipped}`,
      }
    }
    throw new Error('too many redirects')
  } catch (err) {
    return {
      text: trimmed,
      fetched: false,
      note: `Could not fetch page content (${
        (err as Error).message || 'unknown error'
      }); summarized from the URL alone.`,
    }
  }
}
