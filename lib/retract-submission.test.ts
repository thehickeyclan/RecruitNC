import { describe, expect, it } from "vitest"
import { publishesImmediately } from "./retract-submission"

describe("publishesImmediately", () => {
  it("knows which submissions are live before an admin sees them", () => {
    expect(publishesImmediately("tournament_result")).toBe(true)
    expect(publishesImmediately("significant_win")).toBe(true)
  })

  it("leaves the reviewed kinds alone", () => {
    // These still gate on approval, so their buttons must keep saying Approve and Reject.
    expect(publishesImmediately("achievements")).toBe(false)
    expect(publishesImmediately("ranked_athlete_update")).toBe(false)
    expect(publishesImmediately(null)).toBe(false)
    expect(publishesImmediately(undefined)).toBe(false)
  })
})
