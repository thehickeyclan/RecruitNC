import { describe, expect, it } from "vitest"
import { familyNextStep } from "./family-next-step"

describe("familyNextStep", () => {
  it("walks the funnel in order", () => {
    expect(familyNextStep({ signedIn: false }).step).toBe("claim")
    expect(familyNextStep({ signedIn: true, athleteId: null }).step).toBe("claim")
    expect(familyNextStep({ signedIn: true, athleteId: "a", hasGpa: false, hasCell: true })).toMatchObject({ step: "complete", label: "Add your GPA", href: "/profile-setup?id=a" })
    expect(familyNextStep({ signedIn: true, athleteId: "a", hasGpa: false, hasCell: false }).label).toBe("Add your GPA and cell")
    expect(familyNextStep({ signedIn: true, athleteId: "a", hasGpa: true, hasCell: true, insider: false }).step).toBe("insider")
    expect(familyNextStep({ signedIn: true, athleteId: "a", hasGpa: true, hasCell: true, insider: true, commandCenter: false }).step).toBe("command_center")
    expect(familyNextStep({ signedIn: true, athleteId: "a", hasGpa: true, hasCell: true, insider: true, commandCenter: true }).step).toBe(null)
  })
})
