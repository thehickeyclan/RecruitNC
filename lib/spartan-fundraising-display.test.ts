import { describe, expect, it } from "vitest"
import {
  fundraisingCodeToFullNameMap,
  mergeFundraisingAthleteEntries,
  normalizeSpartanPublicAthleteDisplay,
  type FundraisingAthleteEntry,
} from "@/lib/spartan-fundraising-code"
import {
  buildStripeAthleteDisplayHintsByCode,
  resolveFundraisingAthleteRowName,
  resolvePublicAthleteCreditLabel,
} from "@/lib/spartan-fayetteville-stripe"

function entry(
  partial: Partial<FundraisingAthleteEntry> & Pick<FundraisingAthleteEntry, "code" | "fullName">,
): FundraisingAthleteEntry {
  return {
    id: partial.id ?? `id:${partial.code}`,
    code: partial.code,
    label: partial.label ?? partial.fullName,
    fullName: partial.fullName,
    searchBlob: partial.searchBlob ?? "",
  }
}

describe("mergeFundraisingAthleteEntries", () => {
  it("prefers full first+last when main roster and extras share the same NCU code (case-insensitive)", () => {
    const fromAthletes = [entry({ code: "NCU-ADAMSM-27", fullName: "M. Adams", id: "a1" })]
    const extras = [entry({ code: "ncu-adamsm-27", fullName: "Madison Adams", id: "x1" })]
    const merged = mergeFundraisingAthleteEntries(fromAthletes, extras)
    expect(merged).toHaveLength(1)
    expect(merged[0].fullName).toBe("Madison Adams")
  })

  it("retains extras-only codes (manual Spartan roster rows)", () => {
    const fromAthletes = [entry({ code: "NCU-SMITH-27", fullName: "Pat Smith", id: "a1" })]
    const extras = [entry({ code: "NCU-APONTEJ-31", fullName: "Jack Aponte", id: "x1" })]
    const merged = mergeFundraisingAthleteEntries(fromAthletes, extras)
    expect(merged.map((e) => e.code).sort()).toEqual(["NCU-APONTEJ-31", "NCU-SMITH-27"])
  })
})

describe("fundraisingCodeToFullNameMap (public /spartan names)", () => {
  it("maps collision codes to the richer merged full name", () => {
    const fromAthletes = [entry({ code: "NCU-ADAMSM-27", fullName: "M. Adams", id: "a1" })]
    const extras = [entry({ code: "NCU-ADAMSM-27", fullName: "Madison Adams", id: "x1" })]
    const map = fundraisingCodeToFullNameMap(mergeFundraisingAthleteEntries(fromAthletes, extras))
    expect(map.get("NCU-ADAMSM-27")).toBe("Madison Adams")
    expect(map.get("ncu-adamsm-27")).toBe("Madison Adams")
  })
})

describe("normalizeSpartanPublicAthleteDisplay", () => {
  it("strips school suffix and grad year from checkout labels", () => {
    expect(normalizeSpartanPublicAthleteDisplay("M. Adams '27 · Leesville Road")).toBe("M. Adams")
    expect(normalizeSpartanPublicAthleteDisplay("J. Aponte '31 · Cardinal Gibbons")).toBe("J. Aponte")
  })
})

describe("buildStripeAthleteDisplayHintsByCode", () => {
  it("prefers a full name over M. Last 'YY when both appear for the same code", () => {
    const rows = [
      { athleteCode: "NCU-X-27", athleteDisplayName: "M. Example '27" },
      { athleteCode: "NCU-X-27", athleteDisplayName: "Madison Example" },
    ]
    const hints = buildStripeAthleteDisplayHintsByCode(rows)
    expect(hints.get("ncu-x-27")).toBe("Madison Example")
  })

  it("normalizes a single long picker string (school + grad)", () => {
    const rows = [
      {
        athleteCode: "NCU-X-27",
        athleteDisplayName: "M. Adams '27 · Leesville Road",
      },
    ]
    expect(buildStripeAthleteDisplayHintsByCode(rows).get("ncu-x-27")).toBe("M. Adams")
  })
})

describe("resolveFundraisingAthleteRowName", () => {
  it("uses directory before Stripe hints", () => {
    const map = new Map([["NCU-X-27", "Directory Full Name"]])
    const hints = new Map([["ncu-x-27", "Stripe Name"]])
    expect(resolveFundraisingAthleteRowName("NCU-X-27", map, hints)).toBe("Directory Full Name")
  })

  it("strips trailing grad suffix from Stripe fallback", () => {
    const map = new Map<string, string>()
    const hints = new Map([["ncu-x-27", "M. Example '27"]])
    expect(resolveFundraisingAthleteRowName("NCU-X-27", map, hints)).toBe("M. Example")
  })

  it("uses deterministic code label when directory and hints are empty", () => {
    const map = new Map<string, string>()
    expect(resolveFundraisingAthleteRowName("NCU-X-27", map)).toBe("X · '27")
  })
})

describe("resolvePublicAthleteCreditLabel", () => {
  it("uses aggregated Stripe hint when directory has no row", () => {
    const map = new Map<string, string>()
    const hints = new Map([["ncu-z-28", "Zoe Athlete"]])
    const d = {
      attribution: "athlete" as const,
      athleteCode: "NCU-Z-28",
      athleteDisplayName: null as string | null,
      manualCreditName: null as string | null,
    }
    expect(resolvePublicAthleteCreditLabel(d, map, hints)).toBe("Zoe Athlete")
  })

  it("uses fallback from code when directory and hints have no row", () => {
    const map = new Map<string, string>()
    const d = {
      attribution: "athlete" as const,
      athleteCode: "NCU-Z-28",
      athleteDisplayName: null as string | null,
      manualCreditName: null as string | null,
    }
    expect(resolvePublicAthleteCreditLabel(d, map)).toBe("Z · '28")
  })
})
