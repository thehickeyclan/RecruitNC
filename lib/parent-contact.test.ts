import { describe, expect, it } from "vitest"

import { cleanParentContact, isValidParentEmail, parentContactAccess } from "./parent-contact"

const none = { isLinkedParent: false, ownsAsParent: false, isAdmin: false, isVerifiedCoach: false }

describe("parent contact", () => {
  it("shows to the wrestler's parent, college coaches and admins only", () => {
    expect(parentContactAccess(none)).toEqual({ see: false, edit: false })
    expect(parentContactAccess({ ...none, isLinkedParent: true })).toEqual({ see: true, edit: true })
    expect(parentContactAccess({ ...none, ownsAsParent: true })).toEqual({ see: true, edit: true })
    expect(parentContactAccess({ ...none, isVerifiedCoach: true })).toEqual({ see: true, edit: false })
    expect(parentContactAccess({ ...none, isAdmin: true })).toEqual({ see: true, edit: true })
  })

  it("keeps nothing when nothing was typed, and tidies what was", () => {
    expect(cleanParentContact({ name: " ", email: "", phone: null })).toBeNull()
    expect(cleanParentContact({ name: " Misty Samuel ", email: "MK@Example.com " })).toEqual({ name: "Misty Samuel", email: "mk@example.com", phone: null })
    expect(isValidParentEmail("mk@example.com")).toBe(true)
    expect(isValidParentEmail("mk@example")).toBe(false)
  })
})
