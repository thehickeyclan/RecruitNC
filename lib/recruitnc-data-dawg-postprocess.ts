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
  return out
}
