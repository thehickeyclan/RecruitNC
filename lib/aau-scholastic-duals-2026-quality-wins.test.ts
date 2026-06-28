import { describe, expect, it } from "vitest"
import {
  AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS,
  enrichAauQualityWins,
  getAauScholasticQualityWinsEnriched,
} from "@/lib/aau-scholastic-duals-2026-quality-wins"

describe("AAU Scholastic Duals 2026 quality wins", () => {
  it("includes Mac Johnson with eight curated opponents", () => {
    const mac = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Mac Johnson")
    expect(mac).toBeDefined()
    expect(mac!.wins).toHaveLength(8)
    expect(mac!.summaryBullets).toHaveLength(5)
  })

  it("enriches Mac quality wins with bout results from dual logs", () => {
    const mac = enrichAauQualityWins(AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS[0]!)

    const held = mac.wins.find((w) => w.opponentName === "Zach Held")
    expect(held?.resultLine).toBe("TF 17-1 3:10")
    expect(held?.opponentTeam).toBe("Nebraska Magic")

    const gomez = mac.wins.find((w) => w.opponentName === "Andrew Gomez")
    expect(gomez?.resultLine).toBe("MD 9-0")
    expect(gomez?.matchNumber).toBe(12)

    const enrichedCount = mac.wins.filter((w) => w.resultLine).length
    expect(enrichedCount).toBeGreaterThanOrEqual(7)
  })

  it("returns enriched entries for public page", () => {
    const entries = getAauScholasticQualityWinsEnriched()
    expect(entries.length).toBe(1)
    expect(entries[0]!.wrestler).toBe("Mac Johnson")
  })
})
