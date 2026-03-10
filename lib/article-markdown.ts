/**
 * Renders article markdown to HTML. Supports: # headers, **bold**, [links](url),
 * -, 1. lists, markdown tables (|...|), ---, and paragraphs.
 */
export function articleMarkdownToHtml(md: string): string {
  if (!md || typeof md !== "string") return ""
  const lines = md.split(/\r?\n/)
  const out: string[] = []
  let i = 0

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function inlineFormat(text: string): string {
    const linkPlaceholders: string[] = []
    let s = text
    // [text](url) → placeholder so inserted HTML is not escaped below
    s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, t, url) => {
      const u = escapeHtml(String(url))
      const t2 = inlineFormat(String(t)) // allow bold inside link text
      const tag = `<a href="${u}" class="text-white font-bold underline hover:text-white/90">${t2}</a>`
      const idx = linkPlaceholders.length
      linkPlaceholders.push(tag)
      return `\u0000L${idx}\u0000`
    })
    s = escapeHtml(s)
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>")
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>")
    s = s.replace(/_([^_]+)_/g, "<em>$1</em>")
    linkPlaceholders.forEach((tag, i) => {
      s = s.replace(`\u0000L${i}\u0000`, tag)
    })
    return s
  }

  function parseTableRow(line: string): string[] {
    return line
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      out.push("<hr class='my-8 border-white/20' />")
      i++
      continue
    }

    // Headers
    const h1 = trimmed.match(/^#\s+(.+)$/)
    const h2 = trimmed.match(/^##\s+(.+)$/)
    const h3 = trimmed.match(/^###\s+(.+)$/)
    const h4 = trimmed.match(/^####\s+(.+)$/)
    if (h1) {
      out.push(`<h1 class="text-3xl md:text-4xl font-bold text-white mb-4">${inlineFormat(h1[1])}</h1>`)
      i++
      continue
    }
    if (h2) {
      out.push(`<h2 class="text-2xl font-bold text-white mt-10 mb-3">${inlineFormat(h2[1])}</h2>`)
      i++
      continue
    }
    if (h3) {
      out.push(`<h3 class="text-xl font-bold text-white mt-6 mb-2">${inlineFormat(h3[1])}</h3>`)
      i++
      continue
    }
    if (h4) {
      out.push(`<h4 class="text-lg font-semibold text-white mt-4 mb-2">${inlineFormat(h4[1])}</h4>`)
      i++
      continue
    }

    // Markdown table: consecutive lines starting with |
    if (trimmed.startsWith("|")) {
      const tableRows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = parseTableRow(lines[i])
        if (row.length > 0) tableRows.push(row)
        i++
      }
      // Second row is often separator (|---|---|); if so, use first as header, body from third
      const isSeparator = (row: string[]) =>
        row.length > 0 && row.every((c) => /^:?-+:?$/.test(c.trim()) || c.trim() === "")
      const row0 = tableRows[0]!
      const row1 = tableRows[1]
      const headerRow = row1 && isSeparator(row1) ? row0 : row0
      const bodyStart = row1 && isSeparator(row1) ? 2 : 1
      const bodyRows = tableRows.slice(bodyStart)

      out.push(
        '<div class="overflow-x-auto my-4"><table class="w-full border-collapse border border-white/20 text-left">'
      )
      out.push("<thead><tr>")
      for (const c of headerRow) {
        out.push(
          `<th class="border border-white/20 bg-white/10 px-3 py-2 text-white font-semibold">${inlineFormat(c)}</th>`
        )
      }
      out.push("</tr></thead><tbody>")
      for (const row of bodyRows) {
        out.push("<tr>")
        for (const c of row) {
          // Allow <small>...</small> in cells (displayed as small text)
          let cell = c.replace(/<small>([\s\S]*?)<\/small>/gi, "\u0001SMALL\u0001$1\u0001/SMALL\u0001")
          // Allow <br> in cells
          cell = cell.replace(/<br\s*\/?>/gi, "\u0000BR\u0000")
          let formatted = inlineFormat(cell)
            .replace(/\u0000BR\u0000/g, "<br/>")
            .replace(/\u0001SMALL\u0001([\s\S]*?)\u0001\/SMALL\u0001/g, "<small class=\"text-white/70 text-xs\">$1</small>")
          // Visual half-star: ★ clipped to 50% width (for ½ rating)
          formatted = formatted.replace(
            /<strong>½<\/strong>/g,
            '<span class="inline-flex items-baseline align-middle" title="½ star"><span class="inline-block w-[0.5em] overflow-hidden text-white/90">★</span></span>'
          )
          out.push(
            `<td class="border border-white/20 px-3 py-2 text-white/90">${formatted}</td>`
          )
        }
        out.push("</tr>")
      }
      out.push("</tbody></table></div>")
      continue
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(inlineFormat(lines[i].trim().replace(/^[-*]\s+/, "")))
        i++
      }
      out.push(
        `<ul class="list-disc list-inside my-3 space-y-1 text-white/90">${listItems.map((li) => `<li>${li}</li>`).join("")}</ul>`
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(
          inlineFormat(lines[i].trim().replace(/^\d+\.\s+/, ""))
        )
        i++
      }
      out.push(
        `<ol class="list-decimal list-inside my-3 space-y-1 text-white/90">${listItems.map((li) => `<li>${li}</li>`).join("")}</ol>`
      )
      continue
    }

    // Empty line
    if (!trimmed) {
      i++
      continue
    }

    // Image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      const alt = escapeHtml(imgMatch[1])
      const src = escapeHtml(imgMatch[2])
      out.push(
        `<figure class="my-6"><img src="${src}" alt="${alt}" class="w-full max-w-2xl rounded-lg border border-white/20" /><figcaption class="mt-2 text-sm text-white/70">${alt || ""}</figcaption></figure>`
      )
      i++
      continue
    }

    // Paragraph: collect consecutive non-empty, non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("|") &&
      !/^---+$/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^!\[([^\]]*)\]\(([^)]+)\)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      const joined = paraLines.join(" ")
      out.push(`<p class="my-2 text-white/90">${inlineFormat(joined)}</p>`)
    }
  }

  return out.join("\n")
}
