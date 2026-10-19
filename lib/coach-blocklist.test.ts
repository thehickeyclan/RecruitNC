import { describe, expect, it } from "vitest"
import { blockedCoachMatch } from "./coach-blocklist"

describe("blockedCoachMatch", () => {
  it("matches on any one of email, email name, cell or name", () => {
    expect(blockedCoachMatch({ email: "Jim.Giannotti@greensboro.edu" })).toBe("email")
    expect(blockedCoachMatch({ email: "jim.giannotti@gmail.com" })).toBe("email name")
    expect(blockedCoachMatch({ phone: "(336) 516-8036" })).toBe("cell")
    expect(blockedCoachMatch({ phone: "+1 336 516 8036" })).toBe("cell")
    expect(blockedCoachMatch({ firstName: "James", lastName: "Giannotti" })).toBe("name")
  })
  it("leaves everyone else alone", () => {
    expect(blockedCoachMatch({ firstName: "Justin", lastName: "Harty", email: "justin.harty@greensboro.edu", phone: "3365550100" })).toBeNull()
    expect(blockedCoachMatch({ firstName: "Anna", lastName: "Giannotti" })).toBeNull()
  })
})
