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

describe("formatDataDawgMessage — escaping", () => {
  // Answers echo user input verbatim (`I couldn't find an exact match for "<name>"`),
  // and the result is handed to dangerouslySetInnerHTML.
  it("neutralizes HTML in answer text", () => {
    const html = formatDataDawgMessage(`Liam <img src=x onerror="alert(1)"> placed 3rd`)
    expect(html).not.toMatch(/<img/i)
    expect(html).toContain("&lt;img")
  })

  it("neutralizes script tags", () => {
    const html = formatDataDawgMessage(`<script>alert(document.cookie)</script>`)
    expect(html).not.toMatch(/<script/i)
  })

  it("does not emit javascript: hrefs from markdown links", () => {
    const html = formatDataDawgMessage(`[click](javascript:alert(1))`)
    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).not.toMatch(/<a /)
  })

  it("keeps real link hrefs intact while escaping the text around them", () => {
    const html = formatDataDawgMessage(`See [Anna](/view-profile?id=${id}) <b>now</b>`)
    expect(html).toContain(`href="https://app.ncwrestlingunited.com/view-profile?id=${id}"`)
    expect(html).not.toContain("<b>now</b>")
    expect(html).toContain("&lt;b&gt;")
  })
})

describe("formatDataDawgMessage — markdown", () => {
  it("renders bold instead of stripping the asterisks to flat text", () => {
    const html = formatDataDawgMessage(`**Cardinal Gibbons** wrestling`)
    expect(html).toContain("<strong>Cardinal Gibbons</strong>")
    expect(html).not.toContain("*")
  })

  it("turns dossier hyphen lines into a real list", () => {
    const html = formatDataDawgMessage(
      ["Titles:", "", "- 2025: Champion (4A, 132 lbs)", "- 2024: Runner-up (4A, 126 lbs)"].join("\n"),
    )
    expect(html).toContain("<ul>")
    expect(html).toContain("<li>2025: Champion (4A, 132 lbs)</li>")
    expect(html).toContain("<li>2024: Runner-up (4A, 126 lbs)</li>")
    expect(html).not.toContain("- 2025")
  })

  it("renders numbered lists (the scope-clarify prompt reads as 1 / 2)", () => {
    const html = formatDataDawgMessage(["1. North Carolina overall", "2. That school"].join("\n"))
    expect(html).toContain("<ol>")
    expect(html).toContain("<li>North Carolina overall</li>")
  })

  it("renders headings rather than literal hash marks", () => {
    const html = formatDataDawgMessage(`### NHSCA All-Americans`)
    expect(html).toContain("NHSCA All-Americans")
    expect(html).not.toContain("###")
    expect(html).toMatch(/<h[456]>/)
  })

  it("keeps separate paragraphs separate", () => {
    expect(formatDataDawgMessage("First line.\n\nSecond line.")).toBe("<p>First line.</p><p>Second line.</p>")
  })

  it("keeps a soft line break inside one paragraph", () => {
    expect(formatDataDawgMessage("2026 · Senior\n48–0")).toBe("<p>2026 · Senior<br />48–0</p>")
  })

  it("renders a horizontal rule", () => {
    expect(formatDataDawgMessage("A\n\n---\n\nB")).toContain("<hr />")
  })

  it("renders bold inside list items", () => {
    const html = formatDataDawgMessage(`- **2025** — **Liam Hickey** (Cardinal Gibbons)`)
    expect(html).toContain("<li><strong>2025</strong> — <strong>Liam Hickey</strong> (Cardinal Gibbons)</li>")
  })

  it("links inside list items survive both escaping and list rendering", () => {
    const html = formatDataDawgMessage(`- [Anna](/view-profile?id=${id}) — 4A champ`)
    expect(html).toContain("<li>")
    expect(html).toContain(`href="https://app.ncwrestlingunited.com/view-profile?id=${id}"`)
    expect(html).toContain("— 4A champ")
  })
})
