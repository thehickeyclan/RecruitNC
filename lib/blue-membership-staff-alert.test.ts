import { describe, expect, it } from "vitest"
import { detectBlueMembershipStaffAlert } from "./blue-membership-staff-alert"

describe("detectBlueMembershipStaffAlert", () => {
  it("detects newly paused subscription", () => {
    expect(
      detectBlueMembershipStaffAlert({
        subscription: {
          id: "sub_1",
          status: "active",
          pause_collection: { behavior: "void" },
        } as never,
        isDeleted: false,
        previousAttributes: { pause_collection: null },
        previousMembershipStatus: "active",
      }),
    ).toBe("paused")
  })

  it("detects cancel at period end", () => {
    expect(
      detectBlueMembershipStaffAlert({
        subscription: {
          id: "sub_1",
          status: "active",
          cancel_at_period_end: true,
        } as never,
        isDeleted: false,
        previousAttributes: { cancel_at_period_end: false },
        previousMembershipStatus: "active",
      }),
    ).toBe("cancel_scheduled")
  })

  it("detects immediate cancellation", () => {
    expect(
      detectBlueMembershipStaffAlert({
        subscription: { id: "sub_1", status: "canceled" } as never,
        isDeleted: true,
        previousAttributes: null,
        previousMembershipStatus: "active",
      }),
    ).toBe("cancelled")
  })

  it("ignores repeat cancelled events", () => {
    expect(
      detectBlueMembershipStaffAlert({
        subscription: { id: "sub_1", status: "canceled" } as never,
        isDeleted: true,
        previousAttributes: null,
        previousMembershipStatus: "cancelled",
      }),
    ).toBeNull()
  })
})
