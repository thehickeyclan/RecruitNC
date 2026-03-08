/**
 * Simple formatting for Command Center blast: Markdown → HTML (email) and → plain text (SMS).
 * Supports **bold**, *italic*, [text](url), newlines, bullet/numbered lines.
 */

/** Convert simple Markdown to HTML for email body. */
export function markdownToHtml(md: string): string {
  if (!md || typeof md !== "string") return ""
  let s = md
  // [text](url) -> <a> (before escaping)
  s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, text, url) => {
    const u = String(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    const t = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    return `<a href="${u}" style="color:#003366;text-decoration:underline">${t}</a>`
  })
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  // **bold** -> <strong>
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>")
  // *italic* -> <em>
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>")
  // lines
  const lines = s.split(/\r?\n/)
  const out: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^[-*]\s/.test(trimmed)) {
      out.push(`<li>${trimmed.slice(2).trim()}</li>`)
    } else if (/^\d+\.\s/.test(trimmed)) {
      out.push(`<li>${trimmed.replace(/^\d+\.\s*/, "")}</li>`)
    } else if (trimmed) {
      out.push(`<p style="margin:0.5em 0">${trimmed}</p>`)
    } else {
      out.push("<br/>")
    }
  }
  const joined = out.join("\n")
  if (joined.includes("<li>")) {
    return `<ul style="margin:0.5em 0;padding-left:1.2em">${joined}</ul>`
  }
  return joined
}

/** Strip Markdown/HTML to plain text for SMS. Links become raw URL. */
export function toPlainText(md: string): string {
  if (!md || typeof md !== "string") return ""
  let s = md
  // [text](url) -> url (so SMS has clickable link)
  s = s.replace(/\[([^\]]*)\]\(([^)]+)\)/g, "$2")
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1")
  s = s.replace(/__([^_]+)__/g, "$1")
  s = s.replace(/\*([^*]+)\*/g, "$1")
  s = s.replace(/_([^_]+)_/g, "$1")
  s = s.replace(/<[^>]+>/g, " ")
  s = s.replace(/\s+/g, " ").trim()
  return s
}
