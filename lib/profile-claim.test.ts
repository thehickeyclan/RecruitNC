import { describe, expect, it } from "vitest"
import { surname } from "./profile-claim"

describe("surname", () => {
  it("treats curly and straight apostrophes as the same name", () => {
    expect(surname("Mike D’Ettore")).toBe(surname("Jackson D'Ettore"))
  })

  it("still tells different families apart", () => {
    expect(surname("Matthew Boyle")).not.toBe(surname("Cole Shuster"))
  })

  it("has no surname for a single name", () => {
    expect(surname("Madonna")).toBe("")
  })
})
