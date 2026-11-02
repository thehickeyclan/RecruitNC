import { describe, expect, it } from "vitest"

import { isHeic } from "./prepare-photo"
import { isNationalPath } from "@/lib/recruiting/national-paths"

describe("isHeic", () => {
  it("knows an iPhone photo by its type or its name", () => {
    expect(isHeic({ type: "image/heic", name: "IMG_1.HEIC" })).toBe(true)
    expect(isHeic({ type: "image/heif", name: "x" })).toBe(true)
    // Chrome on a Mac gives a .heic file no type at all.
    expect(isHeic({ type: "", name: "IMG_2.heic" })).toBe(true)
    expect(isHeic({ type: "image/jpeg", name: "IMG_3.jpg" })).toBe(false)
  })
})

describe("RecruitWrestlers serves the steps after a claim", () => {
  it("serves profile setup, edit requests and short links", () => {
    expect(isNationalPath("/profile-setup")).toBe(true)
    expect(isNationalPath("/request-edit")).toBe(true)
    expect(isNationalPath("/w/rahiem-skyers-2027")).toBe(true)
    expect(isNationalPath("/blue")).toBe(false)
  })
})
