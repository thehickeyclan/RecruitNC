import { describe, expect, it } from "vitest"
import { TOC_ROAD_MILESTONES, tocRoadStates } from "@/lib/toc/road-to-september"
import { TOC_TICKET_SALE_AT_MS } from "@/lib/toc/ticket-sale"

describe("tocRoadStates", () => {
  it("on launch eve, everything is ahead and the announcement is next", () => {
    const states = tocRoadStates(TOC_ROAD_MILESTONES, Date.parse("2026-07-23T12:00:00-04:00"))
    expect(states).toEqual(["next", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"])
  })

  it("advances itself: mid-reveals, two done and the presale is next", () => {
    const states = tocRoadStates(TOC_ROAD_MILESTONES, Date.parse("2026-08-15T12:00:00-04:00"))
    expect(states).toEqual(["done", "done", "next", "upcoming", "upcoming", "upcoming"])
  })

  it("tickets milestone flips at the same moment as the buy buttons — one clock, no drift", () => {
    const ticketsIdx = TOC_ROAD_MILESTONES.findIndex((m) => m.atMs === TOC_TICKET_SALE_AT_MS)
    expect(ticketsIdx).toBeGreaterThan(-1)
    expect(tocRoadStates(TOC_ROAD_MILESTONES, TOC_TICKET_SALE_AT_MS - 1)[ticketsIdx]).toBe("next")
    expect(tocRoadStates(TOC_ROAD_MILESTONES, TOC_TICKET_SALE_AT_MS)[ticketsIdx]).toBe("done")
  })

  it("event weekend: everything checked", () => {
    const states = tocRoadStates(TOC_ROAD_MILESTONES, Date.parse("2026-09-19T12:00:00-04:00"))
    expect(states.every((s) => s === "done")).toBe(true)
  })

  it("milestones are in chronological order (the render assumes it)", () => {
    for (let i = 1; i < TOC_ROAD_MILESTONES.length; i++) {
      expect(TOC_ROAD_MILESTONES[i]!.atMs).toBeGreaterThan(TOC_ROAD_MILESTONES[i - 1]!.atMs)
    }
  })
})
