import { describe, expect, it } from "vitest"
import { AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import { AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import { getProfileQualityWins, profileQualityWinCount } from "@/lib/profile-quality-wins"

describe("getProfileQualityWins", () => {
  it("returns AAU Scholastic Duals 2026 block for roster wrestlers with curated wins", () => {
    const blocks = getProfileQualityWins("any-id", ["Mac Johnson"])
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.id).toBe("aau-scholastic-duals-2026")
    expect(blocks[0]?.eventLabel).toContain("2026")
    expect(blocks[0]?.wins.length).toBeGreaterThan(0)
    expect(blocks[0]?.resultsPath).toContain("aau-scholastic-duals-2026")
  })

  it("returns empty array when athlete has no quality wins", () => {
    expect(getProfileQualityWins("any-id", ["Nobody Here"])).toEqual([])
  })

  it("resolves profile override ids to tournament blocks", () => {
    for (const athleteId of Object.values(AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES)) {
      expect(getProfileQualityWins(athleteId, ["Someone Else"]).length).toBeGreaterThan(0)
    }
  })

  it("counts total wins across blocks", () => {
    const wrestlers = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.map((e) => e.wrestler)
    for (const wrestler of wrestlers) {
      const blocks = getProfileQualityWins("any-id", [wrestler])
      expect(profileQualityWinCount(blocks)).toBe(blocks[0]?.wins.length)
    }
  })
})
