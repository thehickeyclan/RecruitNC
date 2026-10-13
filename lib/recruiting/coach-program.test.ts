import { describe, expect, it } from "vitest"
import { coachProgramOf, parseCoachProgram, viewGenderFor } from "./coach-program"

describe("coach program", () => {
  it("reads the program however it was written, and nothing else", () => {
    expect(parseCoachProgram("Women's")).toBe("womens")
    expect(parseCoachProgram("mens")).toBe("mens")
    expect(parseCoachProgram("Both")).toBe("both")
    expect(parseCoachProgram("")).toBeNull()
    expect(parseCoachProgram("coed")).toBeNull()
    expect(coachProgramOf({ app_metadata: { coach_program: "womens" } })).toBe("womens")
    expect(coachProgramOf({ app_metadata: {} })).toBeNull()
    expect(coachProgramOf(null)).toBeNull()
  })

  it("a women's coach starts on the women's lists; everyone else on the men's", () => {
    expect(viewGenderFor("womens")).toBe("Female")
    expect(viewGenderFor("mens")).toBe("Male")
    expect(viewGenderFor("both")).toBe("Male")
    expect(viewGenderFor(null)).toBe("Male")
  })

  it("the switch wins over the program, and junk in the cookie does not", () => {
    expect(viewGenderFor("womens", "Male")).toBe("Male")
    expect(viewGenderFor("mens", "female")).toBe("Female")
    expect(viewGenderFor("womens", "banana")).toBe("Female")
  })
})
