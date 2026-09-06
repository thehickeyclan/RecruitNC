import { afterEach, describe, expect, it } from "vitest"
import {
  claimAlertBody,
  claimAlertRecipients,
  claimAlertSubject,
  type ProfileClaimAlert,
} from "@/lib/profile-claim-notify"

const alert = (over: Partial<ProfileClaimAlert> = {}): ProfileClaimAlert => ({
  athleteId: "abc-123",
  athleteName: "Vincent Grack",
  relationship: "self",
  claimantName: null,
  claimantEmail: "wrestler@example.com",
  previousOwnerUserId: null,
  ...over,
})

const ENV = "RECRUITNC_PROFILE_CLAIM_ALERT_TO"

afterEach(() => {
  delete process.env[ENV]
})

describe("claimAlertRecipients", () => {
  it("is empty when unset, so a missing env var cannot break a claim", () => {
    expect(claimAlertRecipients()).toEqual([])
  })

  it("splits and trims a comma-separated list", () => {
    process.env[ENV] = "a@x.com, b@y.com ,"
    expect(claimAlertRecipients()).toEqual(["a@x.com", "b@y.com"])
  })
})

describe("claimAlertSubject", () => {
  it("names the athlete and how they were claimed", () => {
    expect(claimAlertSubject(alert())).toBe("Vincent Grack claimed")
    expect(claimAlertSubject(alert({ relationship: "parent" }))).toBe("Vincent Grack linked as parent")
  })

  it("flags a claim that displaced an existing owner", () => {
    // The one worth looking at first, so it has to be visible in a subject line.
    expect(claimAlertSubject(alert({ previousOwnerUserId: "old-user" }))).toBe(
      "[REVIEW] Vincent Grack claimed",
    )
  })
})

describe("claimAlertBody", () => {
  it("carries who claimed what, and a link to check it", () => {
    const body = claimAlertBody(alert())
    expect(body).toContain("Vincent Grack")
    expect(body).toContain("This is me")
    expect(body).toContain("wrestler@example.com")
    expect(body).toContain("/view-profile?id=abc-123")
  })

  it("spells out the relationship the claimant chose", () => {
    expect(claimAlertBody(alert({ relationship: "parent" }))).toContain("This is my son or daughter")
  })

  it("says so when an existing owner was replaced", () => {
    expect(claimAlertBody(alert({ previousOwnerUserId: "old-user" }))).toContain(
      "replaced an existing owner",
    )
  })

  it("does not mention a previous owner when there was none", () => {
    expect(claimAlertBody(alert())).not.toContain("Previous owner")
  })
})
