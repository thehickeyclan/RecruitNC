/**
 * Data Dawg message link rendering – so assistant messages show clickable links
 * (e.g. [Anna Ockerman](/unified-profile/xxx) or full URLs) instead of plain text.
 */

const RECRUITNC_APP_URL = "https://app.ncwrestlingunited.com"

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Strip markdown bold (**text** or *text*) for plain display.
 */
function stripAsterisks(text: string): string {
  return text.replace(/\*/g, "")
}

/**
 * Convert markdown links [text](url) and plain URLs to clickable <a> tags.
 * Relative URLs (e.g. /unified-profile/xxx) are turned into full RecruitNC app URLs.
 */
export function renderLinks(text: string): string {
  const linkPlaceholders = new Map<string, string>()
  let placeholderIndex = 0

  let result = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText: string, url: string) => {
    const placeholder = `__LINK_PLACEHOLDER_${placeholderIndex++}__`
    const href = url.startsWith("/") ? RECRUITNC_APP_URL + url : url
    linkPlaceholders.set(
      placeholder,
      `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${escapeHtml(linkText)}</a>`
    )
    return placeholder
  })

  const urlRegex = /(https?:\/\/[^\s<>"]+)/g
  result = result.replace(urlRegex, (match) => {
    if (match.includes("__LINK_PLACEHOLDER")) return match
    return `<a href="${escapeHtml(match)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${escapeHtml(match)}</a>`
  })

  linkPlaceholders.forEach((html, placeholder) => {
    result = result.replace(placeholder, html)
  })

  return result
}

/**
 * Format Data Dawg assistant message: strip bold and turn links into clickable HTML.
 */
export function formatDataDawgMessage(content: string): string {
  return renderLinks(stripAsterisks(content))
}
