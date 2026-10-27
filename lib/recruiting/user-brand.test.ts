import { describe, expect, it } from "vitest"
import { userBrand } from "@/lib/recruiting/user-brand"

describe("which brand a person belongs to", () => {
  it("takes the recorded sign-up site first", () => {
    expect(userBrand({ signup_brand: "recruitwrestlers" }, "NC")).toBe("recruitwrestlers")
    expect(userBrand({ signup_brand: "ncunited" }, "SC")).toBe("ncunited")
  })
  it("treats an older account with a wrestler outside North Carolina as RecruitWrestlers'", () => {
    expect(userBrand({}, "SC")).toBe("recruitwrestlers")
    expect(userBrand(null, "NC")).toBe("ncunited")
    expect(userBrand(undefined, null)).toBe("ncunited")
  })
})
