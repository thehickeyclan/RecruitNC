import { describe, expect, it } from "vitest"
import { cleanViewAsId } from "@/lib/view-as/cookie"

describe("cleanViewAsId", () => {
  it("accepts a user id and nothing else", () => {
    expect(cleanViewAsId(" 62fd1444-78b7-4846-b507-13c07af7b9d7 ")).toBe("62fd1444-78b7-4846-b507-13c07af7b9d7")
    expect(cleanViewAsId("reinhard")).toBeNull()
    expect(cleanViewAsId("x; path=/")).toBeNull()
    expect(cleanViewAsId(null)).toBeNull()
  })
})
