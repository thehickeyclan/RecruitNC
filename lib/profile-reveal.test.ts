import { describe, expect, it } from "vitest"
import { profileGaps } from "@/lib/profile-reveal"

/** A wrestler with nothing a coach needs. */
const EMPTY = {}

/** Filled in with the real column spellings — `academic_gpa`, not `gpa`. */
const COMPLETE = {
  highlight_video_url: "https://example.com/film",
  academic_gpa: 3.9,
  academic_interest: "Engineering",
  photourl: "https://example.com/photo.jpg",
}

describe("profileGaps", () => {
  it("asks for film first — it is what a coach wants after the record", () => {
    expect(profileGaps(EMPTY)[0]).toMatchObject({ field: "highlight_video_url" })
  })

  it("asks for nothing when the profile is complete", () => {
    expect(profileGaps(COMPLETE)).toEqual([])
  })

  it("drops GPA from the asks once the athlete has one", () => {
    const gaps = profileGaps({ academic_gpa: 4.63 })
    expect(gaps.map((g) => g.field)).not.toContain("academic_gpa")
    expect(gaps.map((g) => g.field)).toContain("highlight_video_url")
  })

  it("reads academic_gpa, not the submissions-table `gpa`", () => {
    // `gpa` is a column on athlete_profile_submissions only. Treating it as an answer here
    // would tell a wrestler we have a GPA we cannot actually show a coach.
    expect(profileGaps({ gpa: 4.0 }).map((g) => g.field)).toContain("academic_gpa")
  })

  it("counts a GPA of zero as present rather than missing", () => {
    expect(profileGaps({ academic_gpa: 0 }).map((g) => g.field)).not.toContain("academic_gpa")
  })

  it("treats a blank string as missing", () => {
    expect(profileGaps({ highlight_video_url: "   " }).map((g) => g.field)).toContain(
      "highlight_video_url",
    )
  })

  it("gives every ask a reason the wrestler can act on", () => {
    for (const gap of profileGaps(EMPTY)) {
      expect(gap.label.length).toBeGreaterThan(0)
      expect(gap.why.length).toBeGreaterThan(10)
    }
  })
})
