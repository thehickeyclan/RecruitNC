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

  it("includes Luke Richards with seven curated quality opponents", () => {
    const luke = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Luke Richards")
    expect(luke).toBeDefined()
    expect(luke!.record).toBe("10-2")
    expect(luke!.wins).toHaveLength(7)
    expect(luke!.wins.map((w) => w.opponentName)).toEqual([
      "Max Rowe",
      "Anthony Aguayo",
      "Ajani Flanders",
      "Jan Michael",
      "Jaden Morales",
      "Rylan Robbins",
      "Brandon Wunder",
    ])
  })

  it("enriches Luke Richards quality wins with bout results from dual logs", () => {
    const luke = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Luke Richards")!,
    )

    expect(luke.wins.find((w) => w.opponentName === "Max Rowe")?.resultLine).toBe("DEC 8-2")
    expect(luke.wins.find((w) => w.opponentName === "Anthony Aguayo")?.resultLine).toBe("F 10-0 3:01")
    expect(luke.wins.find((w) => w.opponentName === "Ajani Flanders")?.resultLine).toBe("TF 15-0 4:09")
    expect(luke.wins.find((w) => w.opponentName === "Jan Michael")?.resultLine).toBe("MD 16-5")
    expect(luke.wins.find((w) => w.opponentName === "Jaden Morales")?.resultLine).toBe("MD 14-2")
    expect(luke.wins.find((w) => w.opponentName === "Rylan Robbins")?.resultLine).toBe("TF 17-0 5:29")
    expect(luke.wins.find((w) => w.opponentName === "Brandon Wunder")?.resultLine).toBe("F 11-1 2:47")
    expect(luke.wins.every((w) => w.resultLine)).toBe(true)
  })

  it("enriches Mac quality wins with bout results from dual logs", () => {
    const mac = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Mac Johnson")!,
    )

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

  it("includes Fares Alkurdasi with three curated quality opponents", () => {
    const fares = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Fares Alkurdasi")
    expect(fares).toBeDefined()
    expect(fares!.record).toBe("9-3")
    expect(fares!.wins).toHaveLength(3)
    expect(fares!.wins.map((w) => w.opponentName)).toEqual([
      "Zander Ferguson",
      "D'Marion Erlenbeck",
      "Briggs Collins",
    ])
  })

  it("enriches Fares Alkurdasi quality wins with bout results from dual logs", () => {
    const fares = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Fares Alkurdasi")!,
    )

    expect(fares.wins.find((w) => w.opponentName === "Zander Ferguson")?.resultLine).toBe("MD 14-5")
    expect(fares.wins.find((w) => w.opponentName === "Zander Ferguson")?.opponentTeam).toBe("Nebraska Magic")
    expect(fares.wins.find((w) => w.opponentName === "D'Marion Erlenbeck")?.resultLine).toBe("DEC 6-4")
    expect(fares.wins.find((w) => w.opponentName === "D'Marion Erlenbeck")?.opponentTeam).toBe(
      "Team Michigan Blue 86 AS",
    )
    expect(fares.wins.find((w) => w.opponentName === "Briggs Collins")?.resultLine).toBe("MD 19-9")
    expect(fares.wins.find((w) => w.opponentName === "Briggs Collins")?.opponentTeam).toBe("Iowa Black")
    expect(fares.wins.every((w) => w.resultLine)).toBe(true)
  })

  it("includes Luke Padgett with five curated quality opponents", () => {
    const luke = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Luke Padgett")
    expect(luke).toBeDefined()
    expect(luke!.record).toBe("9-3")
    expect(luke!.wins).toHaveLength(5)
  })

  it("enriches Luke Padgett quality wins with bout results from dual logs", () => {
    const luke = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Luke Padgett")!,
    )

    expect(luke.wins.find((w) => w.opponentName === "Aiden Timberman")?.resultLine).toBe("F 3-0 1:09")
    expect(luke.wins.find((w) => w.opponentName === "Griffin Bergen")?.opponentTeam).toBe("Nebraska Magic")
    expect(luke.wins.find((w) => w.opponentName === "Landon Dickerson")?.resultLine).toBe("DEC 5-4")
    expect(luke.wins.find((w) => w.opponentName === "Zachary Miracle")?.resultLine).toBe("DEC 4-2")
    expect(luke.wins.find((w) => w.opponentName === "Philip Jacobs")?.resultLine).toBe("TF 15-0 2:00")
    expect(luke.wins.every((w) => w.resultLine)).toBe(true)
  })

  it("returns enriched entries for public page", () => {
    const entries = getAauScholasticQualityWinsEnriched()
    expect(entries.length).toBe(5)
    expect(entries.map((e) => e.wrestler)).toEqual([
      "Luke Richards",
      "Mac Johnson",
      "Aaron Ellison",
      "Fares Alkurdasi",
      "Luke Padgett",
    ])
  })
})
