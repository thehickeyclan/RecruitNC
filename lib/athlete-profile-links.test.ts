import { describe, expect, it } from "vitest"
import { formatAthleteAnswerOpening, getAthleteProfileUrl } from "@/lib/athlete-profile-links"

describe("formatAthleteAnswerOpening", () => {
  it("puts Profile link as the first line when athlete id is known", () => {
    const id = "11111111-1111-1111-1111-111111111111"
    const lines = formatAthleteAnswerOpening("Anna Ockerman", id)
    expect(lines[0]).toBe(`Profile: [Anna Ockerman](${getAthleteProfileUrl(id)})`)
    expect(lines[2]).toBe("Here's what I found about Anna Ockerman:")
  })

  it("omits Profile line when there is no id or url", () => {
    const lines = formatAthleteAnswerOpening("Historical Alumni", null)
    expect(lines[0]).toBe("Here's what I found about Historical Alumni:")
    expect(lines.some((l) => l.startsWith("Profile:"))).toBe(false)
  })
})
