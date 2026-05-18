import { describe, expect, it } from "vitest"
import { buildLinkedAthletesPayloadForWallet } from "@/lib/profile-linked-athletes-payload"

describe("buildLinkedAthletesPayloadForWallet", () => {
  const idGore = "11111111-1111-1111-1111-111111111111"
  const idHickey = "22222222-2222-2222-2222-222222222222"
  const idStranger = "33333333-3333-3333-3333-333333333333"

  it("returns exactly one list item per wallet athlete id (matches digital wallet row count)", () => {
    const out = buildLinkedAthletesPayloadForWallet({
      walletAthleteIds: [idGore, idHickey, idStranger],
      athleteRows: [
        { id: idGore, name: "Addison Gore", profile_verified: true, updated_at: null, claimed_by_user_id: null },
        { id: idHickey, name: "Gavin Hickey", profile_verified: true, updated_at: null, claimed_by_user_id: "u1" },
        // idStranger intentionally missing from rows — still must appear for Remove / UI parity
      ],
      parentLinkAthleteIds: new Set([idGore, idHickey, idStranger]),
      profileAthleteId: null,
    })
    expect(out).toHaveLength(3)
    const byId = new Map(out.map((x) => [x.id, x]))
    expect(byId.get(idStranger)?.name).toBe("Athlete")
    expect(byId.get(idStranger)?.canUnlink).toBe(true)
  })

  it("sets canUnlink only for ids present in parent_athlete_links set", () => {
    const out = buildLinkedAthletesPayloadForWallet({
      walletAthleteIds: [idGore, idHickey],
      athleteRows: [
        { id: idGore, name: "A Gore", profile_verified: false, updated_at: null, claimed_by_user_id: null },
        { id: idHickey, name: "G Hickey", profile_verified: false, updated_at: null, claimed_by_user_id: null },
      ],
      parentLinkAthleteIds: new Set([idGore]),
      profileAthleteId: idHickey,
    })
    const gore = out.find((x) => x.id === idGore)!
    const hickey = out.find((x) => x.id === idHickey)!
    expect(gore.canUnlink).toBe(true)
    expect(hickey.canUnlink).toBe(false)
    expect(hickey.isProfilePrimaryAthlete).toBe(true)
  })

  it("sorts by display name so Family tab order is stable", () => {
    const out = buildLinkedAthletesPayloadForWallet({
      walletAthleteIds: [idHickey, idGore],
      athleteRows: [
        { id: idGore, name: "Zebra Last", profile_verified: false, updated_at: null, claimed_by_user_id: null },
        { id: idHickey, name: "Aaron First", profile_verified: false, updated_at: null, claimed_by_user_id: null },
      ],
      parentLinkAthleteIds: new Set(),
      profileAthleteId: null,
    })
    expect(out.map((x) => x.name)).toEqual(["Aaron First", "Zebra Last"])
  })
})
