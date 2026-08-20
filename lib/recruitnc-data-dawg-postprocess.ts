/**
 * RecruitNC-only tweaks for Data Dawg answers (same behavior as the old `/api/ai/chat` proxy).
 * After porting Legacy’s `app/api/ai/chat/route.ts`, call `applyRecruitNcDataDawgAnswerPostProcess(answer)`
 * on the final `answer` string before `NextResponse.json` (main success path and any path that returns `answer`).
 */

const RECRUITNC_APP_URL = "https://app.ncwrestlingunited.com"

/**
 * Previously stripped NCHSAA lines outside an inferred "Class of" window — that removed real alumni
 * history when grad year was mis-inferred from the answer text. Disabled; keep formatting fixes only.
 */
function stripImpossibleNchsaaYears(answer: string): string {
  return answer
}

function toViewProfileUrl(athleteId: string): string {
  return `${RECRUITNC_APP_URL}/view-profile?id=${encodeURIComponent(athleteId)}`
}

/** Normalize profile links to the working public route (same-tab friendly). */
function rewriteProfileUrls(answer: string): string {
  let out = answer
  out = out.replace(
    /https?:\/\/(?:app\.)?ncwrestlingunited\.com\/unified-profile\/([a-f0-9-]{36})(?:\/)?(?=[)\s]|$)/gi,
    (_m, athleteId: string) => toViewProfileUrl(athleteId),
  )
  out = out.replace(
    /https?:\/\/(?:app\.)?ncwrestlingunited\.com\/athletes\/([a-f0-9-]{36})(?:\/)?(?=[)\s]|$)/gi,
    (_m, athleteId: string) => toViewProfileUrl(athleteId),
  )
  out = out.replace(
    /https?:\/\/[^\s)]+\/athletes\/([a-f0-9-]+)/gi,
    (_match: string, athleteId: string) => toViewProfileUrl(athleteId),
  )
  out = out.replace(/https?:\/\/v0-new-college-commits\.vercel\.app\/[^\s)]+/gi, (match: string) => {
    const path = match.replace(/https?:\/\/[^/]+/, "")
    if (path.startsWith("/athletes/")) {
      const id = path.replace("/athletes/", "").replace(/\/$/, "")
      return toViewProfileUrl(id)
    }
    if (path.startsWith("/unified-profile/")) {
      const id = path.replace("/unified-profile/", "").replace(/\/$/, "")
      return toViewProfileUrl(id)
    }
    return path
  })
  out = out.replace(/\/unified-profile\/([a-f0-9-]{36})/gi, (_m, id: string) => `/view-profile?id=${encodeURIComponent(id)}`)
  out = out.replace(/\/athletes\/([a-f0-9-]{36})/gi, (_m, id: string) => `/view-profile?id=${encodeURIComponent(id)}`)
  return out
}

export function applyRecruitNcDataDawgAnswerPostProcess(answer: string): string {
  let out = stripImpossibleNchsaaYears(answer)
  out = out.replace(/lbslbs/gi, "lbs")
  out = out.replace(/(\d+)lbs(?!\s)/gi, "$1 lbs")
  // No markdown headings (### / ## / #) — keep section labels as plain text
  out = out.replace(/^#{1,6}\s+/gm, "")
  out = rewriteProfileUrls(out)
  out = nameBareUrls(out)
  return out
}

/**
 * A URL is never the readable thing. Anything the model (or an older template) left as a bare
 * link becomes a named link, so answers read as sentences instead of pasted addresses.
 */
const APP_HOSTS = new Set([
  "app.ncwrestlingunited.com",
  "ncwrestlingunited.com",
  "www.ncwrestlingunited.com",
])

/** Known pages get the name a person would use for them. */
const PATH_LABELS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/view-profile\b/, () => "View profile"],
  [/^\/nchsaa\/(\d{4})\b/, (m) => `NCHSAA ${m[1]} results`],
  [/^\/nhsca\/(\d{4})\b/, (m) => `NHSCA ${m[1]} results`],
  [/^\/fargo\/(\d{4})\b/, (m) => `Fargo ${m[1]} results`],
  [/^\/fargo\/?$/, () => "Fargo results"],
  [/^\/nchsaa\/?$/, () => "NCHSAA results"],
  [/^\/nhsca\/?$/, () => "NHSCA results"],
  [/^\/(?:public-)?rankings\b/, () => "RecruitNC rankings"],
  [/^\/college-commits\b/, () => "College commits"],
  [/^\/tournament-of-champions\b/, () => "Tournament of Champions"],
  [/^\/national-team\b/, () => "NC United National Team"],
  [/^\/dave-schultz-award\b/, () => "Dave Schultz Award"],
  [/^\/calendar\b/, () => "Calendar"],
  [/^\/high-schools\b/, () => "High schools"],
  [/^\/colleges\b/, () => "Colleges"],
]

function titleCaseSegment(segment: string): string {
  const words = segment.replace(/[-_]+/g, " ").trim()
  if (!words) return "View page"
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function labelForUrl(rawUrl: string): string {
  let path = ""
  let host = ""
  if (rawUrl.startsWith("/")) {
    path = rawUrl
  } else {
    try {
      const u = new URL(rawUrl)
      host = u.hostname.toLowerCase()
      path = u.pathname + u.search
    } catch {
      return "View page"
    }
  }

  if (!host || APP_HOSTS.has(host)) {
    for (const [pattern, label] of PATH_LABELS) {
      const m = path.match(pattern)
      if (m) return label(m)
    }
    const first = path.split("?")[0].split("/").filter(Boolean)[0]
    return first ? titleCaseSegment(first) : "RecruitNC"
  }

  return host.replace(/^www\./, "")
}

/**
 * Give every bare URL a readable name. Markdown links are held aside first so an href already
 * inside `[text](url)` is never rewritten — matching a URL that is itself link markup would
 * corrupt the link.
 */
function nameBareUrls(answer: string): string {
  // Private-use sentinels, written as escapes on purpose — as literals they are invisible in an
  // editor. A digit placeholder would collide with every record and year in the answer.
  const OPEN = "\uE000"
  const CLOSE = "\uE001"

  const held: string[] = []
  const withoutLinks = answer.replace(/\[[^\]\n]*\]\([^)\s]+\)/g, (match) => {
    held.push(match)
    return `${OPEN}${held.length - 1}${CLOSE}`
  })

  const BARE_URL =
    /(?:https?:\/\/[^\s<>"')\]]+|(?<![\w/])\/(?:view-profile|nchsaa|nhsca|fargo|public-rankings|rankings|college-commits|tournament-of-champions|national-team|dave-schultz-award|calendar)(?:[/?][^\s<>"')\]]*)?)/g

  const named = withoutLinks.replace(BARE_URL, (url) => {
    const trimmed = url.replace(/[.,;:]+$/, "")
    const trailing = url.slice(trimmed.length)
    return `[${labelForUrl(trimmed)}](${trimmed})${trailing}`
  })

  return named.replace(
    new RegExp(`${OPEN}(\\d+)${CLOSE}`, "g"),
    (_m, i: string) => held[Number(i)] ?? "",
  )
}
