/**
 * Data Dawg message rendering — turns an assistant answer into the HTML shown in the chat.
 *
 * Answers arrive as markdown and leave as HTML for dangerouslySetInnerHTML, so the order here
 * is load-bearing: pull links out first, escape everything that's left, then add our own markup
 * back. Never interpolate raw answer text into the HTML — answers echo user input (e.g.
 * `I couldn't find an exact match for "<name>"`), which makes any unescaped path an injection
 * route straight from the chat box.
 */

const RECRUITNC_APP_URL = "https://app.ncwrestlingunited.com"

/**
 * Private-use sentinels: survive escapeHtml, carry no markdown meaning, and are not regex
 * metacharacters. Written as escapes on purpose — as literals they are invisible in an editor.
 */
const TOKEN_OPEN = "\uE000"
const TOKEN_CLOSE = "\uE001"

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
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

/** Only http(s) and app-relative hrefs — keeps javascript:/data: URIs out of a link position. */
function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return true
  return /^https?:\/\//i.test(href)
}

function anchorHtml(linkText: string, href: string): string {
  // Same-site app routes must not use target="_blank" (blank / stuck / 404-looking tabs).
  const sameSite = isRecruitNcAppHref(href)
  const target = sameSite ? "" : ` target="_blank" rel="noopener noreferrer"`
  return `<a href="${escapeHtml(href)}"${target} class="text-blue-600 hover:text-blue-800 underline">${escapeHtml(linkText)}</a>`
}

/** Replace links with sentinels so escaping and markdown can't touch their HTML. */
function extractLinks(text: string): { text: string; anchors: string[] } {
  const anchors: string[] = []
  const hold = (html: string): string => {
    anchors.push(html)
    return `${TOKEN_OPEN}${anchors.length - 1}${TOKEN_CLOSE}`
  }

  let result = rewriteLegacyProfilePaths(text)

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText: string, url: string) => {
    const href = url.startsWith("/") ? RECRUITNC_APP_URL + url : url
    if (!isSafeHref(href)) return match
    return hold(anchorHtml(linkText, href))
  })

  result = result.replace(/(https?:\/\/[^\s<>"')\]]+)/g, (match) => hold(anchorHtml(match, match)))

  return { text: result, anchors }
}

function restoreLinks(html: string, anchors: string[]): string {
  return html.replace(
    new RegExp(`${TOKEN_OPEN}(\\d+)${TOKEN_CLOSE}`, "g"),
    (_m, i: string) => anchors[Number(i)] ?? "",
  )
}

/** Inline markdown, applied to already-escaped text. Code first so it can shield the rest. */
function renderInline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/30 px-1 py-0.5 text-[0.85em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
}

const HEADING_RE = /^\s*(#{1,6})\s+(.*)$/
const HR_RE = /^\s*([-*_])\1{2,}\s*$/
const BULLET_RE = /^\s*[-*•]\s+(.*)$/
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/

/**
 * Block-level markdown. Dossiers arrive as "- 2025: Champion (4A, 132 lbs)" lines, which only
 * read as a list if we actually emit one — before this they rendered as literal hyphens in one
 * pre-wrapped blob.
 */
function renderBlocks(escaped: string): string {
  const lines = escaped.split(/\r?\n/)
  const out: string[] = []
  let para: string[] = []
  let list: string[] = []
  let listTag: "ul" | "ol" | null = null

  const flushPara = () => {
    if (!para.length) return
    out.push(`<p>${para.map(renderInline).join("<br />")}</p>`)
    para = []
  }
  const flushList = () => {
    if (listTag && list.length) {
      out.push(`<${listTag}>${list.map((li) => `<li>${renderInline(li)}</li>`).join("")}</${listTag}>`)
    }
    list = []
    listTag = null
  }
  const flushAll = () => {
    flushPara()
    flushList()
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushAll()
      continue
    }
    if (HR_RE.test(line)) {
      flushAll()
      out.push("<hr />")
      continue
    }

    const heading = line.match(HEADING_RE)
    if (heading) {
      flushAll()
      // Chat bubbles start at h4 — the page owns h1–h3.
      const level = Math.min(6, 3 + heading[1].length)
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    const bullet = line.match(BULLET_RE)
    if (bullet) {
      flushPara()
      if (listTag !== "ul") flushList()
      listTag = "ul"
      list.push(bullet[1])
      continue
    }

    const ordered = line.match(ORDERED_RE)
    if (ordered) {
      flushPara()
      if (listTag !== "ol") flushList()
      listTag = "ol"
      list.push(ordered[1])
      continue
    }

    flushList()
    para.push(line)
  }

  flushAll()
  return out.join("")
}

/**
 * Convert markdown links [text](url) and plain URLs to clickable <a> tags.
 * Relative URLs (e.g. /view-profile?id=xxx) are turned into full RecruitNC app URLs.
 * Legacy /unified-profile/[id] and /athletes/[id] links are rewritten to /view-profile?id=[id].
 * Inline only — text is escaped, but no block structure. See formatDataDawgMessage.
 */
export function renderLinks(text: string): string {
  const { text: held, anchors } = extractLinks(text)
  return restoreLinks(escapeHtml(held), anchors)
}

/** Render an assistant answer to display HTML: links, bold, headings, and real lists. */
export function formatDataDawgMessage(content: string): string {
  const { text: held, anchors } = extractLinks(content)
  return restoreLinks(renderBlocks(escapeHtml(held)), anchors)
}
