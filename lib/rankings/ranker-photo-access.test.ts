import { describe, expect, it } from "vitest"
import { rankerMayUploadPhotoFor } from "./ranker-photo-access"

const brandon = [
  { access: "edit", gender: "Female", years: "all" },
  { access: "read", gender: "Male", years: "all" },
]

describe("rankerMayUploadPhotoFor", () => {
  it("lets the girls' ranker set a ranked girl's photo", () => {
    expect(rankerMayUploadPhotoFor(brandon, { gender: "Female", graduationyear: 2027, prospect_ranking: 3 })).toBe(true)
  })

  it("not an unranked girl, nor one below the class's depth", () => {
    expect(rankerMayUploadPhotoFor(brandon, { gender: "Female", graduationyear: 2027, prospect_ranking: null })).toBe(false)
    expect(rankerMayUploadPhotoFor(brandon, { gender: "Female", graduationyear: 2027, prospect_ranking: 99 })).toBe(false)
  })

  it("not a boy: he can only read the men's boards", () => {
    expect(rankerMayUploadPhotoFor(brandon, { gender: "Male", graduationyear: 2027, prospect_ranking: 3 })).toBe(false)
  })

  it("nobody without a grant", () => {
    expect(rankerMayUploadPhotoFor([], { gender: "Female", graduationyear: 2027, prospect_ranking: 3 })).toBe(false)
    expect(rankerMayUploadPhotoFor(undefined, { gender: "Female", graduationyear: 2027, prospect_ranking: 3 })).toBe(false)
  })
})
