import { describe, expect, it } from "vitest"
import { isSanctioned, loadStateSanctioning, sanctioningKey } from "@/lib/recruiting/state-events"

function client(result: { data?: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {}
  q.select = () => q
  q.eq = async () => result
  return { from: () => q } as never
}

const WV_GIRLS = [
  { season: 2024, association: "WVSSAC", gender: "Girls", classification: "Girls Invitational", sanctioned: false },
  { season: 2026, association: "WVSSAC", gender: "Boys", classification: "Division 1", sanctioned: true },
]

describe("loadStateSanctioning", () => {
  it("carries only the events that were not sanctioned", async () => {
    const s = await loadStateSanctioning(client({ data: WV_GIRLS }), "WV")
    expect(s.size).toBe(1)
    expect(s.get(sanctioningKey(2024, "WVSSAC", "Girls", "Girls Invitational"))).toBe(false)
  })

  it("answers 'everything sanctioned' when the column does not exist yet", async () => {
    /* PostgREST refuses the whole select on an unknown column; isolated, that costs only this. */
    const s = await loadStateSanctioning(client({ error: { message: 'column "sanctioned" does not exist' } }), "WV")
    expect(s.size).toBe(0)
    expect(isSanctioned(s, 2024, "WVSSAC", "Girls", "Girls Invitational")).toBe(true)
  })
})

describe("isSanctioned", () => {
  it("is false only for the exact event recorded as unsanctioned", async () => {
    const s = await loadStateSanctioning(client({ data: WV_GIRLS }), "WV")
    expect(isSanctioned(s, 2024, "WVSSAC", "Girls", "Girls Invitational")).toBe(false)
    expect(isSanctioned(s, 2026, "WVSSAC", "Girls", "Girls Invitational")).toBe(true)
    expect(isSanctioned(s, 2024, "WVSSAC", "Boys", "AAA")).toBe(true)
  })

  it("does not care about spacing or case, which are typed by hand", async () => {
    const s = await loadStateSanctioning(client({ data: WV_GIRLS }), "WV")
    expect(isSanctioned(s, "2024", " wvssac ", "GIRLS", "girls invitational")).toBe(false)
  })

  it("treats an empty map as everything sanctioned, which is the pre-migration state", () => {
    expect(isSanctioned(new Map(), 2024, "WVSSAC", "Girls", "Girls Invitational")).toBe(true)
    expect(isSanctioned(null, 2024, "WVSSAC", "Girls", "Girls Invitational")).toBe(true)
  })
})
