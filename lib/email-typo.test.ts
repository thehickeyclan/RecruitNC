import { describe, expect, it } from "vitest"
import { suggestEmailFix } from "./email-typo"

describe("suggestEmailFix", () => {
  it("fixes the typos in the real users list", () => {
    expect(suggestEmailFix("killianlanden@gmail.con")).toBe("killianlanden@gmail.com")
    expect(suggestEmailFix("talongrady065@gamil.com")).toBe("talongrady065@gmail.com")
    expect(suggestEmailFix("denzelb2008@ilcloud.com")).toBe("denzelb2008@icloud.com")
    expect(suggestEmailFix("greyson.swain@student.nhcs.et")).toBe("greyson.swain@student.nhcs.net")
  })
  it("leaves good addresses alone", () => {
    expect(suggestEmailFix("coach@washjeff.edu")).toBeNull()
    expect(suggestEmailFix("someone@gmail.com")).toBeNull()
    expect(suggestEmailFix("x@icloud.com")).toBeNull()
  })
})
