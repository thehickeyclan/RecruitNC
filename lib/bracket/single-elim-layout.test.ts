import { describe, expect, it } from "vitest"
import {
  buildEmptySingleElimTree,
  buildSingleElimTreeFromSeeds,
  layoutSingleElimBracket,
  matchCenterY,
  totalBracketHeight,
} from "@/lib/bracket/single-elim-layout"

describe("single-elim bracket layout", () => {
  it("centers semifinal between quarterfinal pairs for 8-man", () => {
    const slotH = 36
    const gap = 8
    const q0 = matchCenterY(0, 0, slotH, gap)
    const q1 = matchCenterY(0, 1, slotH, gap)
    const sf0 = matchCenterY(1, 0, slotH, gap)
    expect(sf0).toBe((q0 + q1) / 2)
  })

  it("lays out 8-man bracket with connectors", () => {
    const tree = buildEmptySingleElimTree(8)
    const layout = layoutSingleElimBracket(tree)
    expect(tree.rounds).toHaveLength(3)
    expect(layout.matches).toHaveLength(7)
    expect(layout.connectors).toHaveLength(6)
    expect(layout.width).toBeGreaterThan(600)
  })

  it("builds partial seeded 8-man with TBD slots", () => {
    const tree = buildSingleElimTreeFromSeeds(8, [
      { id: "a1", seed: 1, name: "Tobin McNair", subtitle: "Test HS" },
    ])
    const r1 = tree.rounds[0]
    expect(r1[0].top.name).toBe("Tobin McNair")
    expect(r1[0].top.seed).toBe(1)
    expect(r1[0].bottom.isOpen).toBe(true)
    expect(r1[0].bottom.seed).toBe(8)
  })

  it("scales to 16-man", () => {
    const tree = buildEmptySingleElimTree(16)
    expect(tree.rounds[0]).toHaveLength(8)
    const layout = layoutSingleElimBracket(tree)
    expect(layout.matches).toHaveLength(15)
    expect(totalBracketHeight(16, 36, 8)).toBeGreaterThan(totalBracketHeight(8, 36, 8))
  })
})
