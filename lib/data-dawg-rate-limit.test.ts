import { beforeEach, describe, expect, it } from "vitest"
import {
  checkDataDawgRateLimit,
  clampConversationHistory,
  rateLimitKey,
  resetDataDawgRateLimit,
  DATA_DAWG_RATE_LIMIT_MAX,
  DATA_DAWG_RATE_LIMIT_WINDOW_MS,
  DATA_DAWG_MAX_HISTORY_ITEM_CHARS,
  DATA_DAWG_MAX_HISTORY_ITEMS,
} from "./data-dawg-rate-limit"

beforeEach(() => resetDataDawgRateLimit())

describe("rateLimitKey", () => {
  it("prefers the signed-in user over the IP", () => {
    expect(rateLimitKey({ userId: "abc", forwardedFor: "1.2.3.4" })).toBe("user:abc")
  })

  it("takes the client IP, not the proxy chain", () => {
    expect(rateLimitKey({ forwardedFor: "1.2.3.4, 10.0.0.1, 10.0.0.2" })).toBe("ip:1.2.3.4")
  })

  it("puts unidentifiable callers in one shared bucket rather than giving each a fresh one", () => {
    expect(rateLimitKey({})).toBe("ip:unknown")
    expect(rateLimitKey({ forwardedFor: "  " })).toBe("ip:unknown")
  })
})

describe("checkDataDawgRateLimit", () => {
  it("allows up to the limit then refuses", () => {
    const now = 1_000_000
    for (let i = 0; i < DATA_DAWG_RATE_LIMIT_MAX; i++) {
      expect(checkDataDawgRateLimit("ip:1.2.3.4", now).allowed).toBe(true)
    }
    const blocked = checkDataDawgRateLimit("ip:1.2.3.4", now)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("keeps callers in separate buckets", () => {
    const now = 1_000_000
    for (let i = 0; i < DATA_DAWG_RATE_LIMIT_MAX; i++) {
      checkDataDawgRateLimit("ip:1.2.3.4", now)
    }
    expect(checkDataDawgRateLimit("ip:1.2.3.4", now).allowed).toBe(false)
    expect(checkDataDawgRateLimit("ip:5.6.7.8", now).allowed).toBe(true)
  })

  it("lets the caller back in once the window rolls past", () => {
    const now = 1_000_000
    for (let i = 0; i < DATA_DAWG_RATE_LIMIT_MAX; i++) {
      checkDataDawgRateLimit("ip:1.2.3.4", now)
    }
    expect(checkDataDawgRateLimit("ip:1.2.3.4", now).allowed).toBe(false)
    const later = now + DATA_DAWG_RATE_LIMIT_WINDOW_MS + 1
    expect(checkDataDawgRateLimit("ip:1.2.3.4", later).allowed).toBe(true)
  })

  it("counts a refused request against nothing — a blocked caller is not punished further", () => {
    const now = 1_000_000
    for (let i = 0; i < DATA_DAWG_RATE_LIMIT_MAX; i++) {
      checkDataDawgRateLimit("ip:1.2.3.4", now)
    }
    checkDataDawgRateLimit("ip:1.2.3.4", now)
    // One expiry later the whole window frees up, rather than sliding on rejected hits.
    const later = now + DATA_DAWG_RATE_LIMIT_WINDOW_MS + 1
    expect(checkDataDawgRateLimit("ip:1.2.3.4", later).allowed).toBe(true)
  })
})

describe("clampConversationHistory", () => {
  it("returns undefined for anything that is not an array", () => {
    expect(clampConversationHistory(undefined)).toBeUndefined()
    expect(clampConversationHistory("nope")).toBeUndefined()
    expect(clampConversationHistory({ role: "user" })).toBeUndefined()
  })

  it("keeps only the turns the agent reads", () => {
    const raw = Array.from({ length: 40 }, (_, i) => ({ role: "user", content: `q${i}` }))
    const out = clampConversationHistory(raw)!
    expect(out).toHaveLength(DATA_DAWG_MAX_HISTORY_ITEMS)
    expect(out[out.length - 1].content).toBe("q39")
  })

  it("truncates a long turn instead of passing it into the prompt whole", () => {
    const out = clampConversationHistory([{ role: "user", content: "x".repeat(50_000) }])!
    expect(out[0].content).toHaveLength(DATA_DAWG_MAX_HISTORY_ITEM_CHARS)
  })

  it("drops junk entries rather than forwarding them", () => {
    expect(clampConversationHistory([null, "text", 5, { role: "user", content: "hi" }])).toEqual([
      { role: "user", content: "hi" },
    ])
  })
})
