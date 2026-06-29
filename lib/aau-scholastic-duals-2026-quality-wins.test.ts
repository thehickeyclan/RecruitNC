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

  it("includes Xan Moody with six curated quality opponents", () => {
    const xan = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Xan Moody")
    expect(xan).toBeDefined()
    expect(xan!.record).toBe("7-5")
    expect(xan!.wins).toHaveLength(6)
    expect(xan!.wins.map((w) => w.opponentName)).toEqual([
      "Zane Homan",
      "Kian Green",
      "Wyatt Anderson",
      "Hudson Cox",
      "Macyn Gardner",
      "Daniel Stefko",
    ])
  })

  it("enriches Xan Moody quality wins with bout results from dual logs", () => {
    const xan = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Xan Moody")!,
    )

    expect(xan.wins.find((w) => w.opponentName === "Zane Homan")?.resultLine).toBe("F 7-0 3:33")
    expect(xan.wins.find((w) => w.opponentName === "Kian Green")?.resultLine).toBe("F 7-0 1:45")
    expect(xan.wins.find((w) => w.opponentName === "Wyatt Anderson")?.resultLine).toBe("TF 21-5 6:00")
    expect(xan.wins.find((w) => w.opponentName === "Hudson Cox")?.resultLine).toBe("F 8-5 4:44")
    expect(xan.wins.find((w) => w.opponentName === "Macyn Gardner")?.resultLine).toBe("MD 12-0")
    expect(xan.wins.find((w) => w.opponentName === "Daniel Stefko")?.resultLine).toBe("TF 15-0 2:51")
    expect(xan.wins.every((w) => w.resultLine)).toBe(true)
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

  it("includes Tye Johnson with seven curated quality opponents", () => {
    const tye = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Tye Johnson")
    expect(tye).toBeDefined()
    expect(tye!.record).toBe("11-1")
    expect(tye!.wins).toHaveLength(7)
    expect(tye!.wins.map((w) => w.opponentName)).toEqual([
      "Gavin Austin",
      "Nevan Irving",
      "Gable Majcher",
      "DeVonne Sesler",
      "Deegan Woomer",
      "Devyn Hicks",
      "Reef Dillard",
    ])
  })

  it("enriches Tye Johnson quality wins with bout results from dual logs", () => {
    const tye = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Tye Johnson")!,
    )

    expect(tye.wins.find((w) => w.opponentName === "Gavin Austin")?.resultLine).toBe("TF 19-4 2:00")
    expect(tye.wins.find((w) => w.opponentName === "Nevan Irving")?.resultLine).toBe("MD 11-2")
    expect(tye.wins.find((w) => w.opponentName === "Gable Majcher")?.resultLine).toBe("TF 18-3 2:42")
    expect(tye.wins.find((w) => w.opponentName === "DeVonne Sesler")?.resultLine).toBe("F 13-2 0:53")
    expect(tye.wins.find((w) => w.opponentName === "Deegan Woomer")?.resultLine).toBe("TF 17-2 2:23")
    expect(tye.wins.find((w) => w.opponentName === "Devyn Hicks")?.resultLine).toBe("TF 16-1 3:54")
    expect(tye.wins.find((w) => w.opponentName === "Reef Dillard")?.resultLine).toBe("DEC 4-1")
    expect(tye.wins.every((w) => w.resultLine)).toBe(true)
  })

  it("includes Jake Amiott with seven curated quality opponents", () => {
    const jake = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Jake Amiott")
    expect(jake).toBeDefined()
    expect(jake!.record).toBe("10-2")
    expect(jake!.wins).toHaveLength(7)
    expect(jake!.wins.map((w) => w.opponentName)).toEqual([
      "Ashton Kuchar",
      "Caden Greiner",
      "Cane Smolarsky",
      "Xander Courneya",
      "Aidyn Roman",
      "Langdon Klinkhammer",
      "William McDonough",
    ])
  })

  it("enriches Jake Amiott quality wins with bout results from dual logs", () => {
    const jake = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Jake Amiott")!,
    )

    expect(jake.wins.find((w) => w.opponentName === "Ashton Kuchar")?.resultLine).toBe("TF 17-0 4:28")
    expect(jake.wins.find((w) => w.opponentName === "Caden Greiner")?.resultLine).toBe("MD 12-4")
    expect(jake.wins.find((w) => w.opponentName === "Cane Smolarsky")?.resultLine).toBe("DEC 2-1")
    expect(jake.wins.find((w) => w.opponentName === "Xander Courneya")?.resultLine).toBe("MD 18-6")
    expect(jake.wins.find((w) => w.opponentName === "Aidyn Roman")?.resultLine).toBe("F 5-4 1:44")
    expect(jake.wins.find((w) => w.opponentName === "Langdon Klinkhammer")?.resultLine).toBe("F 8-1 2:18")
    expect(jake.wins.find((w) => w.opponentName === "William McDonough")?.resultLine).toBe("DEC 12-6")
    expect(jake.wins.every((w) => w.resultLine)).toBe(true)
  })

  it("includes Jacob Perry with six curated quality opponents", () => {
    const jacob = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Jacob Perry")
    expect(jacob).toBeDefined()
    expect(jacob!.record).toBe("9-3")
    expect(jacob!.wins).toHaveLength(6)
    expect(jacob!.wins.map((w) => w.opponentName)).toEqual([
      "Connor McBride",
      "Gavin Cheek",
      "Jayden Rivas",
      "Dylan Fernandez",
      "Carter Knott",
      "Gage Turnblom",
    ])
  })

  it("enriches Jacob Perry quality wins with bout results from dual logs", () => {
    const jacob = enrichAauQualityWins(
      AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.find((w) => w.wrestler === "Jacob Perry")!,
    )

    expect(jacob.wins.find((w) => w.opponentName === "Connor McBride")?.resultLine).toBe("TF 15-0 2:00")
    expect(jacob.wins.find((w) => w.opponentName === "Gavin Cheek")?.resultLine).toBe("MD 19-6")
    expect(jacob.wins.find((w) => w.opponentName === "Jayden Rivas")?.resultLine).toBe("DEC 7-0")
    expect(jacob.wins.find((w) => w.opponentName === "Dylan Fernandez")?.resultLine).toBe("TF 17-1 3:45")
    expect(jacob.wins.find((w) => w.opponentName === "Carter Knott")?.resultLine).toBe("TF 15-0 1:10")
    expect(jacob.wins.find((w) => w.opponentName === "Gage Turnblom")?.resultLine).toBe("TF 15-0 3:40")
    expect(jacob.wins.every((w) => w.resultLine)).toBe(true)
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
    expect(entries.length).toBe(9)
    expect(entries.map((e) => e.wrestler)).toEqual([
      "Xan Moody",
      "Luke Richards",
      "Mac Johnson",
      "Tye Johnson",
      "Jake Amiott",
      "Jacob Perry",
      "Aaron Ellison",
      "Fares Alkurdasi",
      "Luke Padgett",
    ])
  })
})
