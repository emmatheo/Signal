export const SUMMARY_SYSTEM_PROMPT = `You are a terse crypto research assistant. Given a source (a URL, a contract \
address, a Twitter/X thread, or raw pasted text), produce a short structured summary.

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching \
exactly this shape:
{"keyPoints": string[], "risks": string[], "bottomLine": string}

Rules:
- keyPoints: 2-5 short bullet strings, the substantive facts.
- risks: 0-4 short bullet strings covering risks or concerns (contract risk, hype/narrative \
risk, team/track-record concerns, liquidity, etc). Use an empty array if genuinely none.
- bottomLine: one short sentence, plain and direct.
- If the source is a bare contract address or ticker with no other context, summarize what \
can be reasonably inferred and say so plainly in bottomLine rather than inventing detail.
- Never include text outside the JSON object.`

export function buildSummaryUserPrompt(kind: string, raw: string): string {
  return `Source type: ${kind}\n\nSource content:\n${raw}`
}

export const SIGNAL_SYSTEM_PROMPT = `You are a terse crypto signal assistant. Given a \
watchlist item (a token symbol, contract address, or topic), produce one short, scannable \
signal.

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching \
exactly this shape:
{"signal": string, "reason": string}

Rules:
- signal: 1-2 sentences max. Plain, scannable, no hype, no financial-advice disclaimers.
- reason: one short sentence giving the one-line rationale.
- This is informational commentary, not a trade recommendation or execution instruction.`

export function buildSignalUserPrompt(item: string): string {
  return `Watchlist item: ${item}`
}

/**
 * Model output is sometimes wrapped in markdown fences or has stray
 * leading/trailing text despite instructions. Extract the first {...} block
 * before parsing rather than assuming response.trim() is valid JSON.
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through to brace extraction
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model response did not contain a JSON object.')
  }
  return JSON.parse(trimmed.slice(start, end + 1))
}
