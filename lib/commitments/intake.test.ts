import { describe, expect, it } from "vitest"
import { parseIntake, staffTextFor } from "./intake"
import { createApprovalToken, verifyApprovalToken } from "./approval-link"

const NOW = new Date("2026-10-26T20:00:00Z")
const base = {
  athleteId: "592c4ada-f61f-48bf-a0b9-32e0d665c6fd",
  collegeName: "Campbell",
  submitterRole: "college-coach",
  submitterName: "Coach Smith",
  submitterContact: "coach@campbell.edu",
}

describe("parseIntake", () => {
  it("takes a profile, a typed college and a coach's email, and dates it today", () => {
    const r = parseIntake(base, NOW)
    expect(r.ok && r.value.commitmentDate).toBe("2026-10-26")
    expect(r.ok && r.value.collegeName).toBe("Campbell")
  })
  it("needs a class year when there is no profile", () => {
    const r = parseIntake({ ...base, athleteId: "", athleteName: "Steven Presnell" }, NOW)
    expect(r.ok).toBe(false)
    expect(parseIntake({ ...base, athleteId: "", athleteName: "Steven Presnell", graduationYear: 2027 }, NOW).ok).toBe(true)
  })
  it("refuses a contact that is neither an email nor a phone", () => {
    expect(parseIntake({ ...base, submitterContact: "call me" }, NOW).ok).toBe(false)
    expect(parseIntake({ ...base, submitterContact: "(704) 555-0100" }, NOW).ok).toBe(true)
  })
  it("refuses a date in the future and keeps a real one", () => {
    expect(parseIntake({ ...base, commitmentDate: "2026-11-01" }, NOW).ok).toBe(false)
    const r = parseIntake({ ...base, commitmentDate: "2026-10-19" }, NOW)
    expect(r.ok && r.value.commitmentDate).toBe("2026-10-19")
  })
  it("adds a scheme to a bare post link and drops junk", () => {
    const r = parseIntake({ ...base, announcementUrl: "instagram.com/p/abc" }, NOW)
    expect(r.ok && r.value.announcementUrl).toBe("https://instagram.com/p/abc")
    const j = parseIntake({ ...base, announcementUrl: "javascript:alert(1)" }, NOW)
    expect(j.ok && j.value.announcementUrl).toBeNull()
  })
})

describe("staffTextFor", () => {
  it("fits the facts and the link on a lock screen", () => {
    const t = staffTextFor({ athleteName: "Steven Presnell", athleteDetail: "Lincolnton '27", college: "Campbell", role: "college-coach", submitterName: "Coach Smith", hasProfile: true, url: "https://x/approve" })
    expect(t).toBe("New commitment: Steven Presnell (Lincolnton '27) to Campbell. From Coach Smith, college coach. Approve: https://x/approve")
  })
})

describe("approval links", () => {
  it("open one submission, and only until they expire", () => {
    process.env.COMMITMENT_APPROVAL_SECRET = "test-secret"
    const now = Date.parse("2026-10-26T20:00:00Z")
    const token = createApprovalToken("sub-1", now)
    expect(verifyApprovalToken("sub-1", token, now)).toBe(true)
    expect(verifyApprovalToken("sub-2", token, now)).toBe(false)
    expect(verifyApprovalToken("sub-1", token, now + 31 * 86_400_000)).toBe(false)
    expect(verifyApprovalToken("sub-1", "garbage", now)).toBe(false)
  })
})
