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

  it("includes Aaron Ellison with five curated quality opponents", () => {
    const aaron = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Aaron Ellison")
    expect(aaron).toBeDefined()
    expect(aaron!.record).toBe("12-0")
    expect(aaron!.wins).toHaveLength(5)
    expect(aaron!.wins.map((w) => w.opponentName)).toEqual([
      "Vincent Lenz",
      "Gustavo Ferreira",
      "Grant Leininger",
      "Landon Burt",
      "Payton Sampson",
    ])
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

  it("enriches Aaron quality wins with bout results from dual logs", () => {
    const aaron = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Aaron Ellison")!,
    )

    expect(aaron.wins.find((w) => w.opponentName === "Vincent Lenz")?.resultLine).toBe("DEC 11-6")
    expect(aaron.wins.find((w) => w.opponentName === "Gustavo Ferreira")?.resultLine).toBe("DEC 8-7")
    expect(aaron.wins.find((w) => w.opponentName === "Grant Leininger")?.resultLine).toBe("MD 14-4")
    expect(aaron.wins.find((w) => w.opponentName === "Landon Burt")?.resultLine).toBe("F 3-0 0:46")
    expect(aaron.wins.find((w) => w.opponentName === "Payton Sampson")?.resultLine).toBe("DEC 4-1 SV")
    expect(aaron.wins.every((w) => w.resultLine)).toBe(true)
  })

  it("returns enriched entries for public page", () => {
    const entries = getAauScholasticQualityWinsEnriched()
    expect(entries.length).toBe(2)
    expect(entries.map((e) => e.wrestler)).toEqual(["Mac Johnson", "Aaron Ellison"])
  })
})
