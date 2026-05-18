import { describe, expect, it } from "vitest"
import { athleteCodeFromPersistedDonationRawMetadata } from "@/lib/spartan-donation-athlete-code"
import { effectiveAthleteCodeForDonationLedgerRow } from "@/lib/spartan-credit-corrections"

describe("athleteCodeFromPersistedDonationRawMetadata", () => {
  it("reads NCU from metadata when athlete_code column was not persisted", () => {
    expect(
      athleteCodeFromPersistedDonationRawMetadata({ athlete_code: "NCU-HICKEY-29" }),
    ).toBe("NCU-HICKEY-29")
  })

  it("falls back to fundraising_code in mirror blobs", () => {
    expect(athleteCodeFromPersistedDonationRawMetadata({ fundraising_code: "NCU-HICKEY-29" })).toBe("NCU-HICKEY-29")
  })
})

describe("effectiveAthleteCodeForDonationLedgerRow + metadata fallback", () => {
  const emptyIdx = { athleteBySessionOrPi: new Map<string, string>(), generalFundSessionOrPi: new Set<string>() }

  it("uses raw_metadata when athlete_code column is null", () => {
    const code = effectiveAthleteCodeForDonationLedgerRow(
      {
        id: "cs_test",
        athlete_code: null,
        raw_metadata: { athlete_code: "NCU-HICKEY-29", channel: "spartan" },
      },
      emptyIdx,
    )
    expect(code).toBe("NCU-HICKEY-29")
  })
})
