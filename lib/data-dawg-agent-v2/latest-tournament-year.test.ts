import { describe, expect, it, vi, beforeEach } from "vitest"
// vi.mock is hoisted above imports, so a static import still gets the mocked supabase.
import {
  getLatestNchsaaStateYear,
  listNchsaaStateYears,
  nchsaaRealignmentNote,
  NCHSAA_REALIGNMENT_YEAR,
} from "@/lib/data-dawg-agent-v2/latest-tournament-year"

/**
 * Pins "no year → most recent season, from the database".
 *
 * The regression this guards: `year` used to be required, so a yearless question forced the
 * model to invent one. It answered "who won 4A state at 132?" with 2023 — out of 14 available
 * years — stated it confidently, and never said it had chosen.
 */

const rows: Array<{ year: number; classification: string }> = [
  // 2026: NCHSAA realigned — 1A-4A became 1A/2A + 3A-8A.
  { year: 2026, classification: "4A" },
  { year: 2026, classification: "8A" },
  { year: 2026, classification: "1A/2A" },
  // Pre-realignment seasons.
  { year: 2025, classification: "4A" },
  { year: 2025, classification: "3A" },
  { year: 2024, classification: "4A" },
  { year: 2023, classification: "4A" },
  { year: 2013, classification: "4A" },
]

const order = vi.fn()
vi.mock("@/lib/server-supabase", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        order: (...a: unknown[]) => {
          order(...a)
          return { range: async () => ({ data: rows, error: null }) }
        },
      }),
    }),
  }),
}))

beforeEach(() => order.mockClear())

describe("getLatestNchsaaStateYear", () => {
  it("resolves a yearless 4A question to the most recent season, not an arbitrary one", async () => {
    const r = await getLatestNchsaaStateYear("4A")
    expect(r.year).toBe(2026)
    // The exact bug: 2023 exists and was being chosen.
    expect(r.year).not.toBe(2023)
    expect(r.availableYears).toContain(2023)
  })

  it("offers the other years so the answer can say they exist", async () => {
    const r = await getLatestNchsaaStateYear("4A")
    expect(r.availableYears[0]).toBe(2026)
    expect(r.availableYears).toEqual([...r.availableYears].sort((a, b) => b - a))
    expect(r.availableYears.length).toBeGreaterThan(1)
  })

  it("resolves a division that only exists post-realignment to the year it exists in", async () => {
    // 8A was created in 2026 — the newest year overall happens to match, but the point is
    // it resolves against rows for THAT division, not the global max.
    const r = await getLatestNchsaaStateYear("8A")
    expect(r.year).toBe(2026)
    expect(r.availableYears).toEqual([2026])
    expect(r.spansRealignment).toBe(false)
  })

  it("flags a division whose meaning changed at the realignment", async () => {
    const r = await getLatestNchsaaStateYear("4A")
    // 4A exists both before and after 2026, so it means two different fields of schools.
    expect(r.spansRealignment).toBe(true)
  })

  it("falls back to the newest season overall when no division is named", async () => {
    const r = await getLatestNchsaaStateYear(null)
    expect(r.year).toBe(2026)
  })

  it("returns null rather than guessing when we hold nothing for that division", async () => {
    const r = await getLatestNchsaaStateYear("9A")
    expect(r.year).toBeNull()
    expect(r.availableYears).toEqual([])
  })

  it("lists seasons newest first", async () => {
    expect(await listNchsaaStateYears()).toEqual([2026, 2025, 2024, 2023, 2013])
  })

  it("caches so a yearless question doesn't re-scan the table each call", async () => {
    await getLatestNchsaaStateYear("4A")
    const calls = order.mock.calls.length
    await getLatestNchsaaStateYear("3A")
    await getLatestNchsaaStateYear("4A")
    expect(order.mock.calls.length).toBe(calls)
  })
})

describe("nchsaaRealignmentNote", () => {
  it("explains that a numbered division changed meaning in 2026", () => {
    const note = nchsaaRealignmentNote("4A", 2026)
    expect(note).toContain(String(NCHSAA_REALIGNMENT_YEAR))
    expect(note).toContain("4A")
  })

  it("says nothing when there's no division to be ambiguous about", () => {
    expect(nchsaaRealignmentNote(null, 2026)).toBeNull()
    expect(nchsaaRealignmentNote("", 2026)).toBeNull()
  })

  it("says nothing for labels that are already realignment-aware", () => {
    // These names encode the merge, so there's nothing to warn about.
    expect(nchsaaRealignmentNote("1A/2A", 2026)).toBeNull()
    expect(nchsaaRealignmentNote("1-4A", 2025)).toBeNull()
  })
})
