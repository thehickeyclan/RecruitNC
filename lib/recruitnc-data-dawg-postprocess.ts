/**
 * RecruitNC-only tweaks for Data Dawg answers (same behavior as the old `/api/ai/chat` proxy).
 * After porting Legacy’s `app/api/ai/chat/route.ts`, call `applyRecruitNcDataDawgAnswerPostProcess(answer)`
 * on the final `answer` string before `NextResponse.json` (main success path and any path that returns `answer`).
 */

/**
 * Previously stripped NCHSAA lines outside an inferred "Class of" window — that removed real alumni
 * history when grad year was mis-inferred from the answer text. Disabled; keep formatting fixes only.
 */
function stripImpossibleNchsaaYears(answer: string): string {
  return answer
}

export function applyRecruitNcDataDawgAnswerPostProcess(answer: string): string {
  let out = stripImpossibleNchsaaYears(answer)
  out = out.replace(/lbslbs/gi, "lbs")
  out = out.replace(/(\d+)lbs(?!\s)/gi, "$1 lbs")
  // No markdown headings (### / ## / #) — keep section labels as plain text
  out = out.replace(/^#{1,6}\s+/gm, "")
  out = out.replace(/https?:\/\/[^\s]+\/athletes\/([a-f0-9-]+)/gi, (_match: string, athleteId: string) => {
    return `/view-profile?id=${encodeURIComponent(athleteId)}`
  })
  out = out.replace(/https?:\/\/v0-new-college-commits\.vercel\.app\/[^\s)]+/gi, (match: string) => {
    const path = match.replace(/https?:\/\/[^/]+/, "")
    if (path.startsWith("/athletes/")) {
      const id = path.replace("/athletes/", "")
      return `/view-profile?id=${encodeURIComponent(id)}`
    }
    if (path.startsWith("/unified-profile/")) {
      const id = path.replace("/unified-profile/", "")
      return `/view-profile?id=${encodeURIComponent(id)}`
    }
    return path
  })
  return out
}
