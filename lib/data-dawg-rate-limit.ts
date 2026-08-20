/**
 * Abuse and cost guard for the Data Dawg agent endpoint.
 *
 * The endpoint is deliberately public — Data Dawg is open to everyone, and the iOS bundle
 * publishes the URL — so the only thing standing between a script and the OpenAI bill is this.
 * A single request can run six tool rounds at 4096 max tokens with the whole tool schema resent
 * each round, so the ceiling per request is high and the limit is correspondingly low.
 *
 * In-memory, per instance. On Vercel that means the effective limit is per warm lambda rather
 * than global, so a distributed flood still gets through proportionally — this stops the cheap
 * attack and the runaway client, not a determined one. Durable limiting needs shared state
 * (Upstash/Redis); this is the version that ships today without new infrastructure.
 */

export const DATA_DAWG_RATE_LIMIT_WINDOW_MS = 60_000
export const DATA_DAWG_RATE_LIMIT_MAX = 12

/** Questions are questions. Anything longer is a payload, not a wrestling question. */
export const DATA_DAWG_MAX_MESSAGE_CHARS = 1_000

/** Per prior turn. The agent only reads the last 8 turns; this bounds what each can carry. */
export const DATA_DAWG_MAX_HISTORY_ITEM_CHARS = 2_000
export const DATA_DAWG_MAX_HISTORY_ITEMS = 8

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

/** Keep the map from growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 5_000

/**
 * Caller identity for limiting: the signed-in user when we have one, else the client IP.
 * Falls back to a shared bucket when neither is available, which is the safe direction —
 * unidentifiable callers share one allowance rather than each getting a fresh one.
 */
export function rateLimitKey(opts: { userId?: string | null; forwardedFor?: string | null }): string {
  if (opts.userId) return `user:${opts.userId}`
  const first = (opts.forwardedFor ?? "").split(",")[0]?.trim()
  return first ? `ip:${first}` : "ip:unknown"
}

export function checkDataDawgRateLimit(
  key: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const bucket = buckets.get(key) ?? { hits: [] }
  const hits = bucket.hits.filter((t) => now - t < DATA_DAWG_RATE_LIMIT_WINDOW_MS)

  if (hits.length >= DATA_DAWG_RATE_LIMIT_MAX) {
    const oldest = hits[0]
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((DATA_DAWG_RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000),
    )
    buckets.set(key, { hits })
    return { allowed: false, retryAfterSeconds }
  }

  hits.push(now)

  if (!buckets.has(key) && buckets.size >= MAX_TRACKED_KEYS) {
    // Drop the coldest bucket rather than refusing to track a new caller.
    const oldestKey = buckets.keys().next().value
    if (oldestKey) buckets.delete(oldestKey)
  }
  buckets.set(key, { hits })

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Test seam — the module holds process-wide state. */
export function resetDataDawgRateLimit(): void {
  buckets.clear()
}

/** Shape the agent reads — matches `HistoryItem` in run-data-dawg-agent. */
export type ClampedHistoryItem = {
  role?: string
  content?: string
  queryResults?: unknown
  queryType?: string
}

/**
 * Trim a client-supplied history array to what the agent will actually read.
 * The array is unbounded on the wire and every item is echoed into the model prompt.
 */
export function clampConversationHistory(raw: unknown): ClampedHistoryItem[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.slice(-DATA_DAWG_MAX_HISTORY_ITEMS).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const h = item as ClampedHistoryItem
    return [
      {
        ...h,
        content: typeof h.content === "string" ? h.content.slice(0, DATA_DAWG_MAX_HISTORY_ITEM_CHARS) : undefined,
      },
    ]
  })
}
