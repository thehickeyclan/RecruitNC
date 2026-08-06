import { describe, expect, it } from "vitest"
import {
  buildEmptySingleElimTree,
  buildSingleElimTreeFromSeeds,
  layoutSingleElimBracket,
  matchCenterY,
  standardSeedPairs,
  totalBracketHeight,
} from "@/lib/bracket/single-elim-layout"

describe("single-elim bracket layout", () => {
  it("centers semifinal between quarterfinal pairs for 8-man", () => {
    const slotH = 36
    const gap = 12
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

  it("aims connectors at the vertical midlines of wrestler rows", () => {
    const tree = buildEmptySingleElimTree(8)
    const layout = layoutSingleElimBracket(tree)
    const byId = new Map(layout.matches.map((m) => [m.id, m]))

    const q0 = byId.get("r0-m0")!
    const q1 = byId.get("r0-m1")!
    const sf0 = byId.get("r1-m0")!

    // Bout header is inside the card; centerY is the midline between the two slots.
    expect(layout.boutHeaderHeight).toBeGreaterThan(0)
    expect(sf0.centerY).toBe((q0.centerY + q1.centerY) / 2)
    expect(sf0.centerY).toBe(sf0.y + layout.boutHeaderHeight + layout.slotHeight)
    expect(sf0.height).toBe(layout.boutHeaderHeight + layout.slotHeight * 2)

    const toSemi = layout.connectors.find((c) => c.id === "c-r0-m0")!
    expect(toSemi.path).toBe(
      `M ${q0.x + q0.width} ${q0.centerY} H ${q0.x + q0.width + layout.roundGap / 2} V ${sf0.centerY} H ${sf0.x}`,
    )
  })

  it("keeps bout header height inside the match unit on every round", () => {
    const tree = buildEmptySingleElimTree(8)
    const layout = layoutSingleElimBracket(tree)
    for (const m of layout.matches) {
      expect(m.height).toBe(layout.boutHeaderHeight + layout.slotHeight * 2)
      expect(m.centerY - m.y).toBe(layout.boutHeaderHeight + layout.slotHeight)
    }
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
    expect(totalBracketHeight(16, 36, 12)).toBeGreaterThan(totalBracketHeight(8, 36, 12))
  })

  it("uses the approved 16-man championship seed line", () => {
    expect(standardSeedPairs(16)).toEqual([
      [1, 16], [9, 8], [5, 12], [13, 4],
      [3, 14], [6, 11], [7, 10], [15, 2],
    ])
  })
})
