import { describe, expect, it } from "vitest"
import { canonicalCoachKey } from "./coach-purchase-view"

/**
 * A hand-made link stores the coach's key as it was on the day. Shane Barbee's order was linked to
 * his email; he was later resolved onto his account, and the check-in list showed him unpaid with
 * the credential already bought.
 */
describe("canonicalCoachKey", () => {
  const rows = {
    originalKeys: new Map<string, string[]>([
      ["user:dc2bd3bd", ["shane7barbee@gmail.com"]],
      ["user:ef08098a", ["tel:5134907421", "nicholas.kostoff@gmail.com"]],
      ["tel:9107976345", ["tel:9107976345"]],
    ]),
  }
  const contacts = {
    emails: new Map<string, Set<string>>([
      ["user:dc2bd3bd", new Set(["shane7barbee@gmail.com"])],
      ["user:ef08098a", new Set(["nicholas.kostoff@gmail.com", "nick@kostoff.example"])],
    ]),
    phones: new Map<string, Set<string>>([["user:ef08098a", new Set(["5134907421"])]]),
  }

  it("follows a stored email key onto the account the coach became", () => {
    expect(canonicalCoachKey("shane7barbee@gmail.com", rows, contacts)).toBe("user:dc2bd3bd")
  })

  it("follows a stored phone key the same way", () => {
    expect(canonicalCoachKey("tel:5134907421", rows, contacts)).toBe("user:ef08098a")
  })

  it("finds a coach by any address they are known by, not only the original key", () => {
    expect(canonicalCoachKey("nick@kostoff.example", rows, contacts)).toBe("user:ef08098a")
  })

  it("leaves a key that is already current alone", () => {
    expect(canonicalCoachKey("tel:9107976345", rows, contacts)).toBe("tel:9107976345")
  })

  it("returns an unknown key unchanged rather than guessing", () => {
    expect(canonicalCoachKey("nobody@example.com", rows, contacts)).toBe("nobody@example.com")
  })
})
