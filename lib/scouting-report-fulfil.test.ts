import { describe, expect, it, vi } from "vitest"
import {
  fulfilScoutingReportCheckout,
  isScoutingReportSession,
} from "@/lib/scouting-report-fulfil"

/** Minimal Supabase stand-in that records what was upserted. */
function fakeSupabase() {
  const calls: Array<{ table: string; row: Record<string, unknown>; onConflict?: string }> = []
  return {
    calls,
    client: {
      from(table: string) {
        return {
          upsert(row: Record<string, unknown>, opts?: { onConflict?: string }) {
            calls.push({ table, row, onConflict: opts?.onConflict })
            return Promise.resolve({ error: null })
          },
        }
      },
    } as never,
  }
}

const base = {
  sessionId: "cs_123",
  amountTotal: 499,
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
}

describe("isScoutingReportSession", () => {
  it("claims only sessions tagged as ours", () => {
    expect(isScoutingReportSession({ source: "scouting_report" })).toBe(true)
    expect(isScoutingReportSession({ source: "national_team" })).toBe(false)
    expect(isScoutingReportSession({})).toBe(false)
    expect(isScoutingReportSession(null)).toBe(false)
  })
})

describe("fulfilScoutingReportCheckout", () => {
  it("records a single-report purchase against the athlete", async () => {
    const { client, calls } = fakeSupabase()
    const result = await fulfilScoutingReportCheckout(client, {
      ...base,
      metadata: { source: "scouting_report", kind: "single", user_id: "u1", athlete_id: "a1" },
    })
    expect(result).toEqual({ ok: true, granted: "purchase" })
    expect(calls[0]!.table).toBe("scouting_report_purchases")
    expect(calls[0]!.row).toMatchObject({ user_id: "u1", athlete_id: "a1", amount_cents: 499 })
  })

  it("upserts so a redelivered webhook cannot double-grant", async () => {
    // Stripe redelivers; a second row would be a second charge in the ledger.
    const { client, calls } = fakeSupabase()
    await fulfilScoutingReportCheckout(client, {
      ...base,
      metadata: { source: "scouting_report", kind: "single", user_id: "u1", athlete_id: "a1" },
    })
    expect(calls[0]!.onConflict).toBe("user_id,athlete_id")
  })

  it("records a subscription against the user, not an athlete", async () => {
    const { client, calls } = fakeSupabase()
    const result = await fulfilScoutingReportCheckout(client, {
      ...base,
      metadata: { source: "scouting_report", kind: "subscription", user_id: "u1" },
      stripeSubscriptionId: "sub_1",
    })
    expect(result).toEqual({ ok: true, granted: "subscription" })
    expect(calls[0]!.table).toBe("scouting_report_subscriptions")
    expect(calls[0]!.onConflict).toBe("user_id")
    expect(calls[0]!.row).toMatchObject({ user_id: "u1", status: "active", stripe_subscription_id: "sub_1" })
  })

  it("fails loudly when the money cannot be attributed", async () => {
    // Payment arrived and we cannot say whose it is — worth an error, not a silent drop.
    const { client } = fakeSupabase()
    const result = await fulfilScoutingReportCheckout(client, {
      ...base,
      metadata: { source: "scouting_report", kind: "single", athlete_id: "a1" },
    })
    expect(result).toMatchObject({ ok: false })
  })

  it("refuses a single purchase with no athlete", async () => {
    const { client } = fakeSupabase()
    const result = await fulfilScoutingReportCheckout(client, {
      ...base,
      metadata: { source: "scouting_report", kind: "single", user_id: "u1" },
    })
    expect(result).toMatchObject({ ok: false })
  })
})
