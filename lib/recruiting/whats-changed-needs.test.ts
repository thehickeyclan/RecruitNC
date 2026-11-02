import { describe, expect, it } from "vitest"

import type { FamilyNeed } from "@/lib/recruiting/needs-server"
import { buildFeed, coachConfirmedNeeds } from "./whats-changed"

const NOW = new Date("2026-11-02T15:00:00.000Z")
const need = (over: Partial<FamilyNeed>): FamilyNeed => ({
  needId: "n1",
  coachConfirmed: true,
  program: "Campbell",
  mapSchoolId: "campbell-university",
  division: "D1",
  place: "Buies Creek, NC",
  gender: "mens",
  weight: 149,
  classYears: [2028],
  lookingFor: [],
  confirmedAt: "2026-11-01T00:00:00.000Z",
  postedAt: "2026-10-01T00:00:00.000Z",
  ...over,
})
const list = [{ id: "campbell-university", name: "Campbell University", level: "D1" }]

describe("coachConfirmedNeeds", () => {
  it("keeps list colleges only and says when a need is new this week", () => {
    const out = coachConfirmedNeeds([need({ postedAt: "2026-11-01T00:00:00.000Z" }), need({ needId: "n2", mapSchoolId: "duke-university" }), need({ needId: "n3", mapSchoolId: null })], list, NOW)
    expect(out).toEqual([{ schoolId: "campbell-university", name: "Campbell University", level: "D1", weight: 149, source: "coach", line: "New: their coach posted 149" }])
    expect(coachConfirmedNeeds([need({})], list, NOW)[0].line).toBe("Their coach is recruiting 149")
  })

  it("is empty when there are no needs (table missing), and shows above inferred ones", () => {
    expect(coachConfirmedNeeds([], list, NOW)).toEqual([])
    const feed = buildFeed({
      firstName: "Jake",
      now: NOW.toISOString(),
      weight: 150,
      views: [],
      list: [{ id: "campbell-university", name: "Campbell University", level: "D1", status: "interested", contacted: false, savedAt: null }, { id: "elon", name: "Elon", level: "D1", status: "interested", contacted: true, savedAt: null }],
      needs: [{ schoolId: "elon", name: "Elon", level: "D1", weight: 149, source: "inferred", line: "x" }, ...coachConfirmedNeeds([need({})], list, NOW)],
      threads: [],
      visits: [],
      reminders: [],
      listTarget: 20,
      upcomingEvents: 1,
    })
    expect(feed.needs.map((n) => n.source)).toEqual(["coach", "inferred"])
  })

  it("never says offer, spot or scholarship", () => {
    for (const n of coachConfirmedNeeds([need({ lookingFor: ["State placers"] })], list, NOW)) expect(n.line).not.toMatch(/offer|spot|scholarship/i)
  })
})
