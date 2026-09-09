import { describe, expect, it } from "vitest"
import { planSeedAdoption, viewerOrdersForWeight, type ConfirmedInvitation } from "./seed-adoption"

const confirmed: ConfirmedInvitation[] = [
  { invitationId: "a", athleteName: "Tyton Kostoff", officialSeed: 1 },
  { invitationId: "b", athleteName: "Aaron Ellison", officialSeed: 2 },
  { invitationId: "c", athleteName: "Cade Gehris", officialSeed: 8 },
  { invitationId: "d", athleteName: "Ammon Scott", officialSeed: 6 },
]

describe("planSeedAdoption", () => {
  it("numbers the seeder's order from one and says who moves", () => {
    // The real 149 change: Ammon out of contention drops to the bottom, Gehris comes up.
    const plan = planSeedAdoption(["a", "b", "c", "d"], confirmed)
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows.map((r) => `${r.seed} ${r.athleteName}`)).toEqual([
      "1 Tyton Kostoff",
      "2 Aaron Ellison",
      "3 Cade Gehris",
      "4 Ammon Scott",
    ])
    expect(plan.changed).toBe(2)
    expect(plan.rows.filter((r) => r.moved).map((r) => r.athleteName)).toEqual(["Cade Gehris", "Ammon Scott"])
  })

  it("reports no change when the official order already matches", () => {
    const already: ConfirmedInvitation[] = [
      { invitationId: "a", athleteName: "One", officialSeed: 1 },
      { invitationId: "b", athleteName: "Two", officialSeed: 2 },
    ]
    const plan = planSeedAdoption(["a", "b"], already)
    expect(plan.ok && plan.changed).toBe(0)
  })

  it("refuses an order missing a confirmed wrestler, naming them", () => {
    // A wrestler who confirmed after the seeder last looked. Seeding them last by default is how
    // somebody lands in the wrong half of a bracket without anyone deciding it.
    const plan = planSeedAdoption(["a", "b", "c"], confirmed)
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain("Ammon Scott")
  })

  it("refuses an order holding somebody no longer in the weight", () => {
    const plan = planSeedAdoption(["a", "b", "c", "d", "gone"], confirmed)
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toMatch(/no longer confirmed/)
  })

  it("refuses a duplicate", () => {
    const plan = planSeedAdoption(["a", "a", "b", "c"], confirmed)
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toMatch(/twice/)
  })

  it("refuses an empty order rather than clearing the weight", () => {
    expect(planSeedAdoption([], confirmed).ok).toBe(false)
  })

  it("treats a wrestler with no official seed as moved", () => {
    const unseeded: ConfirmedInvitation[] = [{ invitationId: "a", athleteName: "New", officialSeed: null }]
    const plan = planSeedAdoption(["a"], unseeded)
    expect(plan.ok && plan.rows[0].moved).toBe(true)
  })
})

describe("viewerOrdersForWeight", () => {
  const users = [
    {
      id: "u1",
      email: "ryan@thencmat.com",
      app_metadata: { toc_lead_seeder: true, toc_personal_seed_orders: { "149": ["a", "b"], "117": ["c"] } },
    },
    { id: "u2", email: "rhett@thencmat.com", app_metadata: { toc_personal_seed_orders: { "117": ["c", "d"] } } },
    { id: "u3", email: "nobody@example.com", app_metadata: {} },
  ]

  it("finds everyone who has seeded that weight", () => {
    expect(viewerOrdersForWeight(users, 117).map((o) => o.email)).toEqual([
      "ryan@thencmat.com",
      "rhett@thencmat.com",
    ])
    expect(viewerOrdersForWeight(users, 149).map((o) => o.email)).toEqual(["ryan@thencmat.com"])
  })

  it("puts the lead seeder first however the accounts are listed", () => {
    // 117 really did hold two orders that disagreed, with nothing saying which counted.
    const reversed = [users[1], users[0], users[2]]
    const found = viewerOrdersForWeight(reversed, 117)
    expect(found.map((o) => o.email)).toEqual(["ryan@thencmat.com", "rhett@thencmat.com"])
    expect(found[0].isLead).toBe(true)
    expect(found[1].isLead).toBe(false)
  })

  it("skips accounts with nothing saved for it", () => {
    expect(viewerOrdersForWeight(users, 285)).toEqual([])
  })

  it("ignores a malformed order rather than throwing", () => {
    const broken = [{ id: "x", email: null, app_metadata: { toc_personal_seed_orders: { "149": "not-a-list" } } }]
    expect(viewerOrdersForWeight(broken, 149)).toEqual([])
  })
})
