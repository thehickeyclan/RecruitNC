import { describe, expect, it } from "vitest"
import { identityTokensForApplication, institutionTokens, redactApplicantIdentity } from "./blind-redaction"

const APPLICATION = {
  athlete_name: "Jacob Perry",
  athlete_school: "Cardinal Gibbons",
  athlete_email: "jacobperry888@outlook.com",
  athlete_phone: "(336) 555-0100",
  nominator_name: "Justin Perry",
  nominator_email: "justin.usmc@yahoo.com",
  nominator_phone: "856-638-8831",
  reference_name: "Bo Lansche",
  reference_email: null,
  reference_phone: null,
}

const clean = (text: string) => redactApplicantIdentity(text, identityTokensForApplication(APPLICATION)) ?? ""

describe("what a blind reviewer is allowed to read", () => {
  it("removes the applicant's own name, in full and in part", () => {
    expect(clean("Jacob Perry never quit.")).toBe("[redacted] never quit.")
    expect(clean("Everyone calls me Jacob.")).toBe("Everyone calls me [redacted].")
  })

  it("removes a parent named in the essay — the case that undoes blind review", () => {
    expect(clean("My dad Justin drove me every Saturday.")).toBe("My dad [redacted] drove me every Saturday.")
  })

  it("removes the school", () => {
    expect(clean("I wrestle for Cardinal Gibbons.")).toBe("I wrestle for [redacted].")
  })

  it("removes an email and the name hiding inside it", () => {
    expect(clean("Reach me at jacobperry888@outlook.com")).toBe("Reach me at [redacted]")
    /** The local part carries the name even when the address itself is not written out. */
    expect(clean("my handle is justin.usmc")).toBe("my handle is [redacted]")
  })

  it("removes a phone number however it is punctuated", () => {
    for (const written of ["(336) 555-0100", "336-555-0100", "336.555.0100", "3365550100"]) {
      expect(clean(`Call ${written} anytime`)).toBe("Call [redacted] anytime")
    }
  })

  it("removes a hyphenated surname by either half", () => {
    const tokens = identityTokensForApplication({ athlete_name: "Aaron Ruiz-Angel" })
    expect(redactApplicantIdentity("Ruiz wrestled up a weight.", tokens)).toBe("[redacted] wrestled up a weight.")
  })

  it("replaces a full name once rather than leaving half of it", () => {
    expect(clean("Justin Perry nominated him.")).toBe("[redacted] nominated him.")
  })

  it("catches a possessive", () => {
    expect(clean("Jacob's season ended early.")).toBe("[redacted]'s season ended early.")
  })

  it("leaves ordinary words that merely contain a name alone", () => {
    /** "Perry" must not eat "Perryman"; whole-word matching is the point. */
    expect(clean("Coach Perryman ran the room.")).toBe("Coach Perryman ran the room.")
  })

  it("leaves text with nothing identifying untouched", () => {
    const text = "I lost in the regional final and came back the next season."
    expect(clean(text)).toBe(text)
  })

  it("returns null for an empty statement rather than the string 'null'", () => {
    expect(redactApplicantIdentity(null, identityTokensForApplication(APPLICATION))).toBeNull()
  })

  it("ignores a name too short to be safely matched", () => {
    /** A two-letter token would redact half the English language. */
    const tokens = identityTokensForApplication({ athlete_name: "Bo Lansche" })
    expect(redactApplicantIdentity("Bo won the match.", tokens)).toBe("Bo won the match.")
    expect(redactApplicantIdentity("Lansche won the match.", tokens)).toBe("[redacted] won the match.")
  })
})

describe("schools and clubs named anywhere in the essay", () => {
  const DIRECTORY = ["Belmont", "Cardinal Gibbons High School", "Darkhorse Wrestling Club", "Forge", "NC Pride"]
  const tokens = institutionTokens(DIRECTORY)

  it("removes a school the applicant mentions but never listed", () => {
    /** The real leak: an essay named Belmont while the form said somewhere else. */
    expect(redactApplicantIdentity("I drove to Belmont every Saturday.", tokens)).toBe(
      "I drove to [redacted] every Saturday.",
    )
  })

  it("removes a club by its distinctive part, not just its full name", () => {
    expect(redactApplicantIdentity("Darkhorse took me in.", tokens)).toBe("[redacted] took me in.")
    expect(redactApplicantIdentity("I train at Cardinal Gibbons.", tokens)).toBe("I train at [redacted].")
  })

  it("leaves ordinary words alone even when a club is named after one", () => {
    /** "Forge" is a club and also what a wrestler does to their character. */
    expect(redactApplicantIdentity("Adversity will forge you.", tokens)).toBe("Adversity will forge you.")
    expect(redactApplicantIdentity("I wrestled with pride.", tokens)).toBe("I wrestled with pride.")
  })

  it("ignores a name too short to match safely", () => {
    expect(institutionTokens(["RAW"])).toEqual([])
  })

  it("does not reduce a school to a word an essay would use", () => {
    /** "South Point High School" became "Point" and ate "there was a point when he wanted to quit". */
    const t = institutionTokens(["South Point High School", "Crest High School", "Burns High School"])
    expect(redactApplicantIdentity("There was a point when he wanted to quit.", t)).toBe(
      "There was a point when he wanted to quit.",
    )
    expect(redactApplicantIdentity("He burns to win.", t)).toBe("He burns to win.")
    /** The full name still goes. */
    expect(redactApplicantIdentity("I wrestled at South Point High School.", t)).toBe("I wrestled at [redacted].")
  })

  it("still catches a distinctive one-word school", () => {
    const t = institutionTokens(["Belmont"])
    expect(redactApplicantIdentity("I drove to Belmont.", t)).toBe("I drove to [redacted].")
  })
})
