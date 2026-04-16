/**
 * RecruitNC-only tweaks for Data Dawg answers (same behavior as the old `/api/ai/chat` proxy).
 * After porting Legacy’s `app/api/ai/chat/route.ts`, call `applyRecruitNcDataDawgAnswerPostProcess(answer)`
 * on the final `answer` string before `NextResponse.json` (main success path and any path that returns `answer`).
 */

const MIN_YEAR = 1990
const MAX_YEAR = 2035

function stripImpossibleNchsaaYears(answer: string): string {
  const nchsaaBlock = answer.match(
    /((🏆\s*)?NCHSAA\s+State\s+Results\s*:?\s*\n)([\s\S]*?)(?=\n\s*(🏆|Super32|NHSCA|National Team|Career|High School Career|🇺🇸|\n\n\s*[A-Z])|$)/i,
  )
  if (!nchsaaBlock) return answer

  const [, header, , sectionContent] = nchsaaBlock
  const classMatch = answer.match(/\b[Cc]lass\s+of\s+(20\d{2})\b/)
  let gradYear: number | null = classMatch ? parseInt(classMatch[1], 10) : null
  if (!gradYear && sectionContent) {
    const yearMatches = sectionContent.match(/^\s*[-•*]\s*(20\d{2})\s*:/gm)
    if (yearMatches?.length) {
      const maxY = Math.max(...yearMatches.map((m) => parseInt(m.replace(/\D/g, "").slice(0, 4), 10)))
      gradYear = maxY + 2
    }
  }
  if (!gradYear || gradYear < 2000 || gradYear > 2040) return answer

  const minYear = Math.max(MIN_YEAR, gradYear - 4)
  const maxYear = Math.min(MAX_YEAR, gradYear)

  const filtered = sectionContent
    .replace(/^(\s*[-•*]\s*)(20\d{2})(\s*:\s*[^\n]*)/gm, (match, _p, yearStr) => {
      const y = parseInt(yearStr, 10)
      return y >= minYear && y <= maxYear ? match : ""
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  const fullBlock = nchsaaBlock[0]
  const newBlock = header + filtered
  return answer.replace(fullBlock, newBlock).replace(/\n{3,}/g, "\n\n").trim()
}

export function applyRecruitNcDataDawgAnswerPostProcess(answer: string): string {
  let out = stripImpossibleNchsaaYears(answer)
  out = out.replace(/lbslbs/gi, "lbs")
  out = out.replace(/(\d+)lbs(?!\s)/gi, "$1 lbs")
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
