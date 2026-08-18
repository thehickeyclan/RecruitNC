import { describe, expect, it } from "vitest"
import { buildTocDefaultReminderMessage, formatRecruitNcSmsBody } from "@/lib/toc/reminder-message"

describe("formatRecruitNcSmsBody", () => {
  it("prefixes RecruitNC when missing", () => {
    expect(formatRecruitNcSmsBody("Hello")).toBe("RecruitNC: Hello")
    expect(formatRecruitNcSmsBody("RecruitNC: Already")).toBe("RecruitNC: Already")
  })
})

describe("buildTocDefaultReminderMessage", () => {
  it("includes confirm link for invited athletes", () => {
    const msg = buildTocDefaultReminderMessage({
      athleteName: "Carson Worrick",
      athleteId: "2608f74c-1262-44dd-9097-c990ed3c0166",
      weightClass: 165,
      status: "invited",
      invitedAt: "2026-08-18T14:00:00.000Z",
    })
    expect(msg).toContain("Carson")
    expect(msg).toContain("165")
    expect(msg).toContain("confirm?athlete=")
    expect(msg).toContain("August 25, 2026")
    expect(msg).not.toContain("August 14, 2026")
  })
})
