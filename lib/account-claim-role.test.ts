import { describe, expect, it } from "vitest"
import { relationshipForRole } from "./account-claim-role"

describe("relationshipForRole", () => {
  it("a parent account is always a parent, whatever was pressed", () => {
    expect(relationshipForRole({ role: "parent" }, "self")).toBe("parent")
    expect(relationshipForRole({ role: "user", profile_type: "parent" }, null)).toBe("parent")
  })
  it("a wrestler account always owns", () => {
    expect(relationshipForRole({ role: "athlete" }, "parent")).toBe("self")
  })
  it("other roles keep the request", () => {
    expect(relationshipForRole({ role: "fan" }, "parent")).toBe("parent")
    expect(relationshipForRole(null, null)).toBe(null)
  })
})
