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
})

