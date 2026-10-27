import { describe, expect, it } from "vitest"
import { SCOUTING_REPORT_PRICES, SUBSCRIPTION_PLANS, isAnnualKind, isCommandCenterKind, isSubscriptionKind, planTierForKind } from "@/lib/scouting-report-entitlement"

describe("annual plans (Matt, 27 Oct 2026: 20% off, the same on both sites)", () => {
  it("prices each year at twelve months less 20%, to the dime", () => {
    expect(SCOUTING_REPORT_PRICES.subscription_annual).toBe(Math.floor((SCOUTING_REPORT_PRICES.subscription * 12 * 0.8) / 10) * 10)
    expect(SCOUTING_REPORT_PRICES.command_center_annual).toBe(Math.floor((SCOUTING_REPORT_PRICES.command_center * 12 * 0.8) / 10) * 10)
    expect(SCOUTING_REPORT_PRICES.subscription_annual).toBe(9590)
    expect(SCOUTING_REPORT_PRICES.command_center_annual).toBe(23990)
  })
  it("bills yearly and unlocks the same as the monthly plan", () => {
    expect(SUBSCRIPTION_PLANS.command_center_annual.interval).toBe("year")
    expect(isSubscriptionKind("command_center_annual")).toBe(true)
    expect(planTierForKind("command_center_annual")).toBe("command_center")
    expect(planTierForKind("subscription_annual")).toBe("rankings")
    expect(isCommandCenterKind("command_center_annual") && isAnnualKind("command_center_annual") && !isAnnualKind("command_center")).toBe(true)
  })
})
