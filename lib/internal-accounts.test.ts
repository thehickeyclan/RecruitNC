import { describe, expect, it } from "vitest"
import { isInternalAccount } from "./internal-accounts"

describe("isInternalAccount", () => {
  it("catches our own staff domain", () => {
    expect(isInternalAccount("appreview@ncwrestlingunited.com")).toBe(true)
    expect(isInternalAccount("INFO@NCWrestlingUnited.com")).toBe(true)
  })

  it("catches the reserved documentation domains", () => {
    expect(isInternalAccount("test@example.com")).toBe(true)
  })

  it("catches the App Store review login by address", () => {
    expect(isInternalAccount("thehickeyclan+applereview@gmail.com")).toBe(true)
  })

  it("leaves real coaches alone, including the ones that look like test accounts", () => {
    expect(isInternalAccount("rm22@williams.edu")).toBe(false)
    expect(isInternalAccount("mdmcdona@ncsu.edu")).toBe(false)
    // The owner's own address is an admin, not internal-by-domain: admins are excluded by role.
    expect(isInternalAccount("thehickeyclan@gmail.com")).toBe(false)
    // A surname, not a flag.
    expect(isInternalAccount("jreview@muhlenberg.edu")).toBe(false)
  })

  it("treats a missing address as not internal", () => {
    expect(isInternalAccount(null)).toBe(false)
    expect(isInternalAccount("")).toBe(false)
  })
})
