import { describe, expect, it } from "vitest"
import { NC_UNITED_STAFF_BCC, withStaffBcc } from "./resend-staff-bcc"

describe("withStaffBcc", () => {
  it("adds staff BCC for user-facing mail", () => {
    const payload = withStaffBcc({
      from: "NC Wrestling United <info@ncwrestlingunited.com>",
      to: ["parent@example.com"],
      subject: "Test",
      html: "<p>Hi</p>",
    })
    expect(payload.bcc).toContain(NC_UNITED_STAFF_BCC)
  })

  it("skips BCC when info@ is the only recipient", () => {
    const payload = withStaffBcc({
      from: "NC Wrestling United <info@ncwrestlingunited.com>",
      to: [NC_UNITED_STAFF_BCC],
      subject: "Admin alert",
      html: "<p>Hi</p>",
    })
    expect(payload.bcc).toBeUndefined()
  })
})
