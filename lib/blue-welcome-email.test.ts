import { describe, expect, it } from "vitest"
import { buildBlueWelcomeEmailHtml } from "./email"

describe("buildBlueWelcomeEmailHtml", () => {
  it("includes GroupMe, calendar, practices, profile guidance, and billing", () => {
    const html = buildBlueWelcomeEmailHtml({
      to: "parent@example.com",
      parentName: "Jane",
      athleteName: "Aiden Campbell",
    })
    expect(html).toContain("groupme.com")
    expect(html).toContain("/calendar")
    expect(html).toContain("Sundays, 1:00–3:00 PM")
    expect(html).toContain("Fetzer Hall")
    expect(html).toContain("GPA")
    expect(html).toContain("Cell phone")
    expect(html).toContain("/profile")
    expect(html).toContain("NC United Blue")
    expect(html).toContain("Pause or cancel")
    expect(html).toContain("20% off")
  })
})
