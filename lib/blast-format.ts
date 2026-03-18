/**
 * Formatting for Command Center blast: Markdown → HTML (email) and → plain text (SMS).
 * Supports **bold**, *italic*, [text](url), bare URLs, bullets (- * •), numbered lists, ## headings.
 * Normalizes pasted smart quotes/dashes and mojibake so copy-paste from docs works.
 */

/** Fix common paste/mojibake so bullets, quotes, and dashes render correctly. */
function normalizePaste(s: string): string {
  return s
    .replace(/\u2018|\u2019|â€™|â/g, "'")
    .replace(/\u201C|\u201D|â€œ|â€\s?/g, '"')
    .replace(/\u2014|â€"/g, "—")
    .replace(/\u2013|â€"/g, "–")
    .replace(/\u2022|â¢/g, "•")
    .replace(/\u00A0/g, " ")
}

/** Escape HTML in plain text (no tags). */
function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const LINK_PLACEHOLDER = "\uFEFFL\uFEFF" // Unicode placeholder so we can escape rest then restore

/** Convert simple Markdown to HTML for email body. */
export function markdownToHtml(md: string): string {
  if (!md || typeof md !== "string") return ""
  let s = normalizePaste(md)
  const fragments: string[] = []

  // Bare URLs -> placeholder (we'll inject safe <a> after escape)
  s = s.replace(/(^|\s)(https?:\/\/[^\s<>"']+)(\s|$)/g, (_, before, url, after) => {
    const href = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    const idx = fragments.length
    fragments.push(`<a href="${href}" style="color:#003366;text-decoration:underline">${href}</a>`)
    return `${before}${LINK_PLACEHOLDER}${idx}${LINK_PLACEHOLDER}${after}`
  })
  // [text](url) -> placeholder
  s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, text, url) => {
    const u = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    const t = escape(String(text))
    const idx = fragments.length
    fragments.push(`<a href="${u}" style="color:#003366;text-decoration:underline">${t}</a>`)
    return `${LINK_PLACEHOLDER}${idx}${LINK_PLACEHOLDER}`
  })
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  // Restore link placeholders
  s = s.replace(new RegExp(`${LINK_PLACEHOLDER}(\\d+)${LINK_PLACEHOLDER}`, "g"), (_, n) => fragments[parseInt(n, 10)] ?? "")
  // **bold** -> <strong>
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  // *italic* -> <em> (after bold so **x** wins)
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>")

  const lines = s.split(/\r?\n/)
  const out: string[] = []
  let inList = false
  const listStyle = "margin:0.5em 0;padding-left:1.25em;list-style-type:disc"

  for (const line of lines) {
    const trimmed = line.trim()
    const bulletMatch = trimmed.match(/^([-*]|\d+\.|•)\s+(.*)$/) // - , * , 1. , or •
    const isBullet = bulletMatch !== null
    const listContent = isBullet ? (bulletMatch![2] ?? trimmed) : ""

    if (isBullet) {
      if (!inList) {
        out.push(`<ul style="${listStyle}">`)
        inList = true
      }
      out.push(`<li style="margin:0.25em 0">${listContent}</li>`)
    } else if (/^##\s+/.test(trimmed)) {
      if (inList) {
        out.push("</ul>")
        inList = false
      }
      out.push(`<p style="margin:1em 0 0.5em;font-weight:700;font-size:1.1em">${trimmed.replace(/^##\s+/, "")}</p>`)
    } else if (trimmed) {
      if (inList) {
        out.push("</ul>")
        inList = false
      }
      out.push(`<p style="margin:0.5em 0">${trimmed}</p>`)
    } else {
      if (inList) {
        out.push("</ul>")
        inList = false
      }
      out.push("<br/>")
    }
  }
  if (inList) out.push("</ul>")
  return out.join("\n")
}

/** Strip Markdown/HTML to plain text for SMS. Links become raw URL. */
export function toPlainText(md: string): string {
  if (!md || typeof md !== "string") return ""
  let s = normalizePaste(md)
  s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, "$2")
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1")
  s = s.replace(/__([^_]+)__/g, "$1")
  s = s.replace(/\*([^*]+)\*/g, "$1")
  s = s.replace(/_([^_]+)_/g, "$1")
  s = s.replace(/<[^>]+>/g, " ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}
