import { describe, expect, it } from "vitest"
import {
  toAdminParentAthleteFundRow,
  type AdminParentAthleteWalletInput,
} from "@/lib/admin-parent-athlete-wallet-math"

describe("toAdminParentAthleteFundRow", () => {
  it("uses lifetime raised and lifetime spending for the wallet balance", () => {
    const wallet: AdminParentAthleteWalletInput = {
      athleteId: "cole-shuster",
      name: "Cole Shuster",
      fundraisingCode: "NCU-SHUSTER-28",
      totalCents: 194_500,
      giftCount: 31,
      raceSignupCount: 0,
      reimbursementsPaidCents: 56_500,
      guildAllocationsCents: 29_300,
      hubWindowRaisedCents: 65_000,
    }

    expect(toAdminParentAthleteFundRow(wallet)).toMatchObject({
      raisedCents: 194_500,
      hubWindowRaisedCents: 65_000,
      reimbursementsPaidAllTimeCents: 56_500,
      guildAllocationsCents: 29_300,
      netAfterReimbursementsCents: 138_000,
      remainingNotionalCents: 108_700,
    })
  })
})
