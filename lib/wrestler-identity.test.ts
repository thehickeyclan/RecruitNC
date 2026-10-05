import { describe, expect, it } from "vitest"
import { aliasNamesFor, displayName, type WrestlerIdentity } from "./wrestler-identity"

const identity = (over: Partial<WrestlerIdentity> = {}): WrestlerIdentity => ({
  id: "i1",
  canonicalName: "Nick Meza",
  placerName: "nicholas meza",
  normalizedName: "nicholas meza",
  state: "AZ",
  gender: "Male",
  gradYear: null,
  athleteId: null,
  confirmed: false,
  aliases: [{ name: "Nick Meza", team: "AZ", source: "other_tournament_bouts", status: "linked" }],
  ...over,
})

describe("displayName", () => {
  it("keeps a spelling that already has capitals", () => {
    expect(displayName("Nick Meza", [])).toBe("Nick Meza")
  })

  it("prefers a capitalised alias over a lower-case canonical name", () => {
    // Arizona's placer list stores "nicholas meza"; a report must not print it that way.
    expect(displayName("nicholas meza", [{ name: "Nick Meza" }])).toBe("Nick Meza")
  })

  it("capitalises when every spelling is lower case", () => {
    expect(displayName("nicholas meza", [{ name: "nicholas meza" }])).toBe("Nicholas Meza")
  })

  it("leaves a hyphenated or apostrophed name intact", () => {
    expect(displayName("Zoe-Shalom Ahue Bolosan", [])).toBe("Zoe-Shalom Ahue Bolosan")
    expect(displayName("D'Angelo Smith", [])).toBe("D'Angelo Smith")
  })
})

describe("aliasNamesFor", () => {
  it("returns every spelling, the one asked for included", () => {
    const names = aliasNamesFor(
      identity({
        canonicalName: "Will Clanton",
        aliases: [
          { name: "Will Clanton", team: "NY", source: "other_tournament_bouts", status: "linked" },
          { name: "William Clanton", team: "NY", source: "other_tournament_bouts", status: "linked" },
        ],
      }),
      "Will Clanton",
    )
    // 6 bouts under one spelling, 24 under both — the missing 18 is what this fixes.
    expect(names).toEqual(["Will Clanton", "William Clanton"])
  })

  it("dedupes, and leaves the placer spelling out of a bout-store search", () => {
    /*
     * placerName is how the placer store spells him ("nicholas meza"), not how any bracket does.
     * It is used to look a placement back up, deliberately not to widen a bout search, so the
     * only spelling here is the one the bout store actually holds.
     */
    expect(aliasNamesFor(identity(), "Nick Meza")).toEqual(["Nick Meza"])
  })

  it("falls back to the asked-for name when there is no identity", () => {
    // An identity miss must never narrow a search to nothing.
    expect(aliasNamesFor(null, "Landon Lee")).toEqual(["Landon Lee"])
  })

  it("ignores blank spellings rather than searching for an empty name", () => {
    const names = aliasNamesFor(
      identity({ canonicalName: "  ", aliases: [{ name: "", team: null, source: "x", status: "linked" }] }),
      "Jake Kos",
    )
    expect(names).toEqual(["Jake Kos"])
  })
})
