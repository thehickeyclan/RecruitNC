import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildAdminBlastEmailHtml } from "@/lib/admin-blast-email-html"

describe("admin blast email header", () => {
  it("places the NC United logo on a navy header", () => {
    const html = buildAdminBlastEmailHtml("TOC update", "<p>Hello</p>", "https://app.ncwrestlingunited.com", "nc-united")

    expect(html).toContain("background:#003366")
    expect(html).toContain("nc-united-white-logo.png")
    expect(html).not.toContain("background:#000000")
  })

  it("uses a real PNG with an alpha channel for the NC United logo", () => {
    const logo = readFileSync(join(process.cwd(), "public/nc-united-white-logo.png"))

    expect(logo.subarray(1, 4).toString()).toBe("PNG")
    expect([4, 6]).toContain(logo[25])
  })
})
