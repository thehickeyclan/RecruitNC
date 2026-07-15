import { describe, expect, it } from "vitest"
import { getRouteForSuggestedPrompt } from "@/lib/data-dawg-suggested-prompts"
import { formatSuggestedHandlerAnswer } from "@/lib/data-dawg-suggested-handler-answer"
import { NCHSAA_FOUR_TIME_STATE_CHAMPIONS } from "@/lib/nchsaa-four-time-state-champions-data"
import {
  NCHSAA_FOUR_TIME_STATE_PLACERS_SEED,
  normalizePlacerNameKey,
  sortMultiTimePlacersChronological,
} from "@/lib/nchsaa-four-time-state-placers-data"

/** Mirror of getCuratedFourTimeStatePlacers without importing Supabase-backed module. */
function curatedFourTimePlacersForTest() {
  const byKey = new Map(
    NCHSAA_FOUR_TIME_STATE_PLACERS_SEED.map((r) => [normalizePlacerNameKey(r.wrestler_name), r]),
  )
  for (const champ of NCHSAA_FOUR_TIME_STATE_CHAMPIONS) {
    const key = normalizePlacerNameKey(champ.wrestler_name)
    if (byKey.has(key)) continue
    const alt = key.startsWith("CAMERON ")
      ? key.replace(/^CAMERON /, "CAM ")
      : key.startsWith("CAM ")
        ? key.replace(/^CAM /, "CAMERON ")
        : null
    if (alt && byKey.has(alt)) continue
    byKey.set(key, {
      wrestler_name: champ.wrestler_name,
      placement_count: champ.championships.length,
      placements: champ.championships.map((ch) => ({
        year: ch.year,
        place: 1,
        classification: ch.classification,
        weight_class: ch.weight_class,
        school: ch.school,
      })),
      schools: [...champ.schools],
      championships: champ.championships.length,
    })
  }
  return sortMultiTimePlacersChronological([...byKey.values()])
}

describe("NCHSAA four-time state placers", () => {
  it("includes the provided recent archive names", () => {
    const names = new Set(NCHSAA_FOUR_TIME_STATE_PLACERS_SEED.map((p) => p.wrestler_name))
    expect(names.has("Loxston Hooper")).toBe(true)
    expect(names.has("Adair Panama")).toBe(true)
    expect(names.has("Liam Hickey")).toBe(true)
    expect(names.has("Kevin O'Brien")).toBe(true)
    expect(NCHSAA_FOUR_TIME_STATE_PLACERS_SEED).toHaveLength(30)
  })

  it("maps 2022-2026 careers to tournament years 2023–2026", () => {
    const cael = NCHSAA_FOUR_TIME_STATE_PLACERS_SEED.find((p) => p.wrestler_name === "Cael Dunn")
    expect(cael?.placements.map((p) => p.year)).toEqual([2023, 2024, 2025, 2026])
    expect(cael?.placements.map((p) => p.place)).toEqual([1, 1, 1, 1])
  })

  it("merges historical 4x champions not on the seed list (e.g. Jeremiah Price)", () => {
    const merged = curatedFourTimePlacersForTest()
    const names = merged.map((p) => p.wrestler_name)
    expect(names).toContain("Jeremiah Price")
    expect(merged.length).toBeGreaterThan(30)
    expect(names.filter((n) => /stinson/i.test(n))).toHaveLength(1)
  })

  it("routes suggested prompts to state_placer_records", () => {
    expect(getRouteForSuggestedPrompt("who are the 4x state placers?")).toEqual({
      handler: "state_placer_records",
      params: { championshipCount: 4 },
    })
    expect(getRouteForSuggestedPrompt("who are the 4x state place winners?")).toEqual({
      handler: "state_placer_records",
      params: { championshipCount: 4 },
    })
  })

  it("formats a placer list for Agent v2 suggested answers", () => {
    const text = formatSuggestedHandlerAnswer({
      results: curatedFourTimePlacersForTest().slice(0, 2),
      queryType: "state_placer_records",
    })
    expect(text).toMatch(/4x State Placers/i)
    expect(text).toMatch(/1\./)
  })
})
