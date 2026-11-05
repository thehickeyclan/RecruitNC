import { describe, expect, it } from "vitest"
import { withoutContact } from "@/lib/business/view-as-coach"

describe("withoutContact", () => {
  it("empties the phone and keeps everything else", () => {
    expect(withoutContact([{ id: "a", name: "Kid", phone: "9195551234" }])).toEqual([{ id: "a", name: "Kid", phone: null }])
  })
})
