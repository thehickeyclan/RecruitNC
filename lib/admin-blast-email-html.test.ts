import { describe, expect, it } from "vitest"
import { buildAdminBlastEmailHtml } from "@/lib/admin-blast-email-html"

describe("admin blast email header", () => {
  it("places the NC United logo on a navy header", () => {
    const html = buildAdminBlastEmailHtml("TOC update", "<p>Hello</p>", "https://app.ncwrestlingunited.com", "nc-united")

    expect(html).toContain("background:#003366")
    expect(html).toContain("nc-united-stacked-logo-white.png")
    expect(html).not.toContain("background:#000000")
  })
})
