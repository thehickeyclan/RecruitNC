import { describe, expect, it } from "vitest"
import { formatDataDawgMessage, renderLinks } from "@/lib/data-dawg-render-links"

const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

describe("data-dawg-render-links", () => {
  it("rewrites legacy unified-profile markdown links to view-profile and opens same-tab", () => {
    const html = renderLinks(`[Eli Horton](https://app.ncwrestlingunited.com/unified-profile/${id})`)
    expect(html).toContain(`href="https://app.ncwrestlingunited.com/view-profile?id=${id}"`)
    expect(html).not.toContain("/unified-profile/")
    expect(html).not.toContain('target="_blank"')
  })

  it("absolutizes relative view-profile links without target=_blank", () => {
    const html = formatDataDawgMessage(`[Anna](/view-profile?id=${id})`)
    expect(html).toContain(`href="https://app.ncwrestlingunited.com/view-profile?id=${id}"`)
    expect(html).not.toContain('target="_blank"')
  })

  it("keeps target=_blank for external non-app URLs", () => {
    const html = renderLinks(`[Flo](https://www.flograppling.com/foo)`)
    expect(html).toContain('target="_blank"')
  })
})
