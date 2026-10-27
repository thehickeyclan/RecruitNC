import { describe, expect, it } from "vitest"
import { firstLast, prefersDuplicate, sameWrestler, type DuplicateCandidate } from "@/lib/duplicate-athletes"

describe("firstLast", () => {
  it("ignores a nickname sitting in the middle", () => {
    // The pair that started this: one profile held his record, the other his TOC registration,
    // and a full-name key treated them as different people.
    expect(firstLast("Amanuel “Manny” Kahsai")).toBe("amanuel kahsai")
    expect(firstLast("AMANUEL KAHSAI")).toBe("amanuel kahsai")
  })

  it("ignores case, punctuation and straight or curly quotes", () => {
    expect(firstLast('Joshua "Josh" Lemke')).toBe("joshua lemke")
    expect(firstLast("  joshua   lemke  ")).toBe("joshua lemke")
  })

  it("keeps first and last across a middle name", () => {
    expect(firstLast("Ayden James Terwilliger")).toBe("ayden terwilliger")
  })

  it("does not collapse two different people who share a surname", () => {
    expect(firstLast("Tye Johnson")).not.toBe(firstLast("Mac Johnson"))
  })

  it("survives a single-word name", () => {
    expect(firstLast("Titus")).toBe("titus")
    expect(firstLast("")).toBe("")
  })
})

describe("prefersDuplicate", () => {
  it("takes a true flag over a false one", () => {
    // These mark that something happened; a second row never hearing about it is not evidence.
    expect(prefersDuplicate("profile_verified", false, true)).toBe(true)
    expect(prefersDuplicate("profile_verified", true, false)).toBe(false)
  })

  it("takes a real NC United team over a stale none", () => {
    // The Blue signup created several of these duplicates, so the newer row is the informed one.
    expect(prefersDuplicate("ncUnitedTeam", "none", "blue")).toBe(true)
    expect(prefersDuplicate("ncUnitedTeam", "", "blue")).toBe(true)
  })

  it("never downgrades a real team to none", () => {
    expect(prefersDuplicate("ncUnitedTeam", "blue", "none")).toBe(false)
    expect(prefersDuplicate("ncUnitedTeam", "blue", "")).toBe(false)
  })

  it("leaves a ranking conflict to a person", () => {
    // 74 against 75 is one wrestler holding two slots — a rankings question, not a merge rule.
    expect(prefersDuplicate("prospect_ranking", 75, 74)).toBe(false)
  })

  it("leaves an email conflict to a person", () => {
    expect(prefersDuplicate("contactEmail", "coach@school.k12.nc.us", "athlete@gmail.com")).toBe(false)
  })
})

describe("sameWrestler", () => {
  const at = (over: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
    id: "a", name: "Alex Rodriguez", highschool: "Cardinal Gibbons", state: "NC", graduationyear: 2027, gender: "Male", ...over,
  })

  it("is certain when the school and class agree and only the spelling of the name differs", () => {
    /* Each of these was a real pair of pages for one wrestler. */
    for (const [x, y] of [
      ["Alex Rodriguez", "Alexander Rodriguez"],
      ["Wes Files", "Wesley Files"],
      ["Zoe Wolford", "Zoey Wolford"],
      ["Jerry Salazar-Mendoza", "Jerry Salazar Mendoza"],
      ["Tor'Rina Rushing", "TorRina Rushing"],
      ["Steven `Jett` Johnson", "Jett Johnson"],
    ]) {
      expect(sameWrestler(at({ name: x }), at({ id: "b", name: y }))?.grade, `${x} / ${y}`).toBe("certain")
    }
  })

  it("will not merge two wrestlers who share a name", () => {
    /*
     * Maryland's two Logan Browns: Northwest's, class of 2027, and McDonogh's, class of 2028.
     * The first went unminted once because the second existed and shared his name.
     */
    const a = at({ name: "Logan Brown", highschool: "Northwest", state: "MD", graduationyear: 2027 })
    const b = at({ id: "b", name: "Logan Brown", highschool: "McDonogh", state: "MD", graduationyear: 2028 })
    expect(sameWrestler(a, b)).toBeNull()
  })

  it("never crosses a state or a stated gender", () => {
    /* Saniya Brown is a Georgia wrestler and a North Carolina wrestler, and they are two people. */
    expect(sameWrestler(at({ name: "Saniya Brown", state: "GA", highschool: "Bainbridge", graduationyear: 2028 }), at({ id: "b", name: "Saniya Brown", state: "NC", highschool: "Overhills", graduationyear: 2028 }))).toBeNull()
    /* A brother and a sister share a surname and a house. */
    expect(sameWrestler(at({ gender: "Male" }), at({ id: "b", gender: "Female" }))).toBeNull()
  })

  it("holds, rather than merging, what a person should look at", () => {
    expect(sameWrestler(at(), at({ id: "b", highschool: null }))?.grade).toBe("likely")
    expect(sameWrestler(at(), at({ id: "b", graduationyear: null }))?.grade).toBe("likely")
    expect(sameWrestler(at(), at({ id: "b", highschool: "Green Hope" }))?.grade).toBe("review")
    expect(sameWrestler(at(), at({ id: "b", graduationyear: 2028 }))?.grade).toBe("review")
  })
})
