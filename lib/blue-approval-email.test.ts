import { describe, expect, it } from "vitest"
import { buildBlueApprovalEmailHtml } from "./blue-approval-email"

describe("buildBlueApprovalEmailHtml", () => {
  it("includes registration link and public Blue page, not GroupMe", () => {
    const html = buildBlueApprovalEmailHtml({
      athleteFirstName: "Aiden",
      athleteLastName: "Campbell",
      parentName: "Jane",
      registerUrl: "https://app.ncwrestlingunited.com/blue/register?invite=abc123",
    })
    expect(html).toContain("/blue/register?invite=abc123")
    expect(html).toContain("/blue")
    expect(html).toContain("Recruiting assistance")
    expect(html).toContain("20% off")
    expect(html).not.toContain("groupme.com")
    expect(html).not.toContain("not before")
  })
})
