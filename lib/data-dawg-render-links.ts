/**
 * Data Dawg message link rendering – so assistant messages show clickable links
 * (e.g. [Anna Ockerman](/view-profile?id=xxx) or full URLs) instead of plain text.
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

function rewriteLegacyProfilePaths(text: string): string {
  return text
    .replace(
      /https?:\/\/(?:app\.)?ncwrestlingunited\.com\/unified-profile\/([a-f0-9-]{36})(?:\/)?(?=[)\s]|$)/gi,
      (_m, id: string) => `${RECRUITNC_APP_URL}/view-profile?id=${encodeURIComponent(id)}`,
    )
    .replace(
      /https?:\/\/(?:app\.)?ncwrestlingunited\.com\/athletes\/([a-f0-9-]{36})(?:\/)?(?=[)\s]|$)/gi,
      (_m, id: string) => `${RECRUITNC_APP_URL}/view-profile?id=${encodeURIComponent(id)}`,
    )
    .replace(/\/unified-profile\/([a-f0-9-]{36})/gi, (_m, id: string) => `/view-profile?id=${encodeURIComponent(id)}`)
    .replace(/\/athletes\/([a-f0-9-]{36})/gi, (_m, id: string) => `/view-profile?id=${encodeURIComponent(id)}`)
}

function isRecruitNcAppHref(href: string): boolean {
  if (href.startsWith("/")) return true
  try {
    const host = new URL(href).hostname.toLowerCase()
    return (
      host === "app.ncwrestlingunited.com" ||
      host === "ncwrestlingunited.com" ||
      host === "www.ncwrestlingunited.com" ||
      host === "localhost" ||
      host.endsWith(".vercel.app")
    )
  } catch {
    return false
  }
}

function anchorHtml(linkText: string, href: string): string {
  // Same-site app routes must not use target="_blank" (blank / stuck / 404-looking tabs).
  const sameSite = isRecruitNcAppHref(href)
  const target = sameSite ? "" : ` target="_blank" rel="noopener noreferrer"`
  return `<a href="${escapeHtml(href)}"${target} class="text-blue-600 hover:text-blue-800 underline">${escapeHtml(linkText)}</a>`
}

/**
 * Convert markdown links [text](url) and plain URLs to clickable <a> tags.
 * Relative URLs (e.g. /view-profile?id=xxx) are turned into full RecruitNC app URLs.
 * Legacy /unified-profile/[id] and /athletes/[id] links are rewritten to /view-profile?id=[id].
 */
export function renderLinks(text: string): string {
  const linkPlaceholders = new Map<string, string>()
  let placeholderIndex = 0

  let result = rewriteLegacyProfilePaths(text)

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText: string, url: string) => {
    const placeholder = `__LINK_PLACEHOLDER_${placeholderIndex++}__`
    const href = url.startsWith("/") ? RECRUITNC_APP_URL + url : url
    linkPlaceholders.set(placeholder, anchorHtml(linkText, href))
    return placeholder
  })

  const urlRegex = /(https?:\/\/[^\s<>"]+)/g
  result = result.replace(urlRegex, (match) => {
    if (match.includes("__LINK_PLACEHOLDER")) return match
    return anchorHtml(match, match)
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
