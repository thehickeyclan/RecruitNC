/**
 * Format known suggested-prompt handler payloads for Agent v2 (no LLM rewrite).
 */

export function formatSuggestedHandlerAnswer(handlerResult: {
  answer?: unknown
  results?: unknown[]
  aggregateResult?: {
    type?: string
    school?: string
    count?: number
    schoolCounts?: Array<{ school: string; count: number }>
    [key: string]: unknown
  } | null
  queryType?: string
}): string | null {
  if (handlerResult.answer != null && String(handlerResult.answer).trim()) {
    return String(handlerResult.answer)
  }
  const summary = (handlerResult.results?.[0] as { summary?: string } | undefined)?.summary
  if (summary?.trim()) return summary

  const agg = handlerResult.aggregateResult
  if (agg?.type === "nhsca_school_leaderboard") {
    if (agg.school) {
      return (
        `**${agg.school} - NHSCA All-Americans**\n\n` +
        `**${agg.school}** has had **${agg.count ?? 0} NHSCA All-American${(agg.count ?? 0) !== 1 ? "s" : ""}**.`
      )
    }
    const schoolCounts = agg.schoolCounts ?? []
    if (schoolCounts.length === 0) {
      return "I could not build an NHSCA All-American school leaderboard from the database right now."
    }
    const totalSchools = schoolCounts.length
    const totalAllAmericans = schoolCounts.reduce((sum, sc) => sum + sc.count, 0)
    const bestSchool = schoolCounts[0]
    const top = schoolCounts.slice(0, 20).map((sc, idx) => {
      const rank = idx + 1
      const medal = rank === 1 ? "1." : rank === 2 ? "2." : rank === 3 ? "3." : `${rank}.`
      return `${medal} **${sc.school}:** ${sc.count} All-American${sc.count !== 1 ? "s" : ""}`
    })
    let text =
      `**NHSCA All-American School Leaderboard**\n\n` +
      `Summary: ${totalSchools} school${totalSchools !== 1 ? "s" : ""} with **${totalAllAmericans} total All-Americans**\n\n` +
      `**${bestSchool.school}** has had the most NHSCA All-Americans with **${bestSchool.count} All-Americans**.\n\n` +
      `Top schools:\n\n` +
      top.join("\n")
    if (schoolCounts.length > 20) {
      text += `\n\n…and ${schoolCounts.length - 20} more schools`
    }
    return text
  }

  const results = handlerResult.results
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0] as {
      wrestler_name?: string
      championships?: Array<{ year?: number; classification?: string; weight_class?: string }>
      placement_count?: number
      placements?: Array<{ year?: number; place?: number; classification?: string; weight_class?: string }>
      schools?: string[]
      years_label?: string
    }
    if (first?.wrestler_name && Array.isArray(first.placements) && first.placement_count != null) {
      const n = results.length
      const times = first.placement_count
      const label = times === 4 ? "4x State Placers" : `${times}x State Placers`
      const ordinal = (p: number) => {
        const v = Math.floor(p)
        if (v === 1) return "1st"
        if (v === 2) return "2nd"
        if (v === 3) return "3rd"
        return `${v}th`
      }
      const lines = results.map((r, idx) => {
        const row = r as typeof first
        const school = (row.schools ?? []).filter(Boolean).join("/") || ""
        const placeTrail = (row.placements ?? [])
          .slice()
          .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
          .map((p) => ordinal(Number(p.place ?? 0)))
          .join("-")
        const years =
          row.years_label ||
          (() => {
            const ys = (row.placements ?? []).map((p) => p.year).filter(Boolean) as number[]
            if (!ys.length) return ""
            return `${Math.min(...ys)}-${Math.max(...ys)}`
          })()
        const schoolBit = school ? ` (${school})` : ""
        const yearsBit = years ? ` ${years}` : ""
        return `${idx + 1}. ${row.wrestler_name}${schoolBit}${yearsBit} — ${placeTrail}`
      })
      return (
        `There are **${n}** wrestlers who are ${label} in North Carolina. Here is the list:\n\n` +
        `${lines.join("\n")}\n\nTotal: ${n} wrestlers.`
      )
    }
    if (first?.wrestler_name && Array.isArray(first.championships)) {
      const n = results.length
      const times = first.championships.length
      const label = times === 4 ? "4x State Champions" : `${times}x State Champions`
      const lines = results.map((r, idx) => {
        const row = r as {
          wrestler_name?: string
          championships?: Array<{ year?: number; classification?: string; weight_class?: string }>
        }
        const champYears = (row.championships ?? [])
          .map((c) => {
            const w = String(c.weight_class ?? "")
              .replace(/lbs?$/i, "")
              .trim()
            return `${c.year} (${c.classification} ${w}lbs)`
          })
          .join(", ")
        return `${idx + 1}. ${row.wrestler_name} - ${champYears}`
      })
      return (
        `There are exactly ${n} wrestlers who are ${label} in North Carolina. Here is the complete list:\n\n` +
        `${lines.join("\n")}\n\nTotal: ${n} wrestlers.`
      )
    }
  }

  return null
}
