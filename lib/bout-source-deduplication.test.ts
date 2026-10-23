import { describe, expect, it } from "vitest"
import { mergeBoutSources } from "@/lib/bout-source-deduplication"

describe("mergeBoutSources", () => {
  it("uses the authoritative States row instead of its RankWrestler copy", () => {
    const merged = mergeBoutSources(
      [{ opponent: "Aiden White", win_loss: "W", venue: "NCHSAA State Championships", weight: 138, result: "DEC 4-1" }],
      [{ opponent: "Aiden White", win_loss: "W", venue: "NCHSAA State Championships", weight: "138", result: "Dec" }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]!.result).toBe("DEC 4-1")
  })

  it("normalizes I-64 spellings before removing the duplicate", () => {
    const merged = mergeBoutSources(
      [{ opponent: "R. Judd", win_loss: "W", venue: "I-64 Spring Duals", weight: 126, result: "DEC 5-2" }],
      [{ opponent: "R. Judd", win_loss: "W", venue: "Interstate 64 Spring Duals", weight: 126, result: "Dec" }],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]!.result).toBe("DEC 5-2")
  })

  it("preserves two genuine meetings while removing both fallback copies", () => {
    const preferred = [
      { opponent: "Same Opponent", win_loss: "W", venue: "I64 Spring Duals", weight: 132, result: "DEC 3-1" },
      { opponent: "Same Opponent", win_loss: "L", venue: "I64 Spring Duals", weight: 132, result: "DEC 2-1" },
    ]
    const merged = mergeBoutSources(preferred, preferred.map((bout) => ({ ...bout, result: bout.win_loss === "W" ? "Dec" : "Dec" })))
    expect(merged).toHaveLength(2)
  })

  it("treats the other states' championships as one event under any spelling (21 Oct 2026)", () => {
    const merged = mergeBoutSources(
      [{ opponent: "Elijah Lowery", win_loss: "W", venue: "SCHSL State Championships", weight: "126", result: "TF 17-2" }],
      [
        { opponent: "Elijah Lowery", win_loss: "W", venue: "2026 SCHSL (SC) State Championships", weight: 126, result: "TF" },
        { opponent: "Sam Roberts", win_loss: "W", venue: "SCHSL AA Upper State Duals", weight: 126, result: "Fall" },
      ],
    )
    expect(merged).toHaveLength(2)
    expect(merged.find((b) => b.opponent === "Elijah Lowery")!.result).toBe("TF 17-2")
    const va = mergeBoutSources(
      [{ opponent: "Jack Yetzer", win_loss: "L", venue: "VHSL State Championships", weight: "113", result: "DEC 3-2" }],
      [{ opponent: "Jack Yetzer", win_loss: "L", venue: "VHSL Class 2 State Tournament", weight: "113", result: "Dec" }],
    )
    expect(va).toHaveLength(1)
  })

  it("folds the same opponent spelled two ways, but never two different opponents", () => {
    const merged = mergeBoutSources(
      [
        { opponent: "Will Edwards", win_loss: "W", venue: "SCHSL State Championships", weight: "138", result: "DEC 5-2" },
        { opponent: "Andrew P Lawson", win_loss: "L", venue: "SCHSL State Championships", weight: "113", result: "MD 10-1" },
      ],
      [
        { opponent: "William Edwards", win_loss: "W", venue: "2026 SCHSL (SC) State Championships", weight: 138, result: "Dec" },
        { opponent: "Andrew Lawson", win_loss: "L", venue: "2026 SCHSL (SC) State Championships", weight: 113, result: "MD" },
        { opponent: "Kevin Edwards", win_loss: "W", venue: "2026 SCHSL (SC) State Championships", weight: 138, result: "Fall" },
      ],
    )
    expect(merged).toHaveLength(3)
    expect(merged.some((b) => b.opponent === "Kevin Edwards")).toBe(true)
  })
})

