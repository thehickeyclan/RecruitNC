/**
 * Execute a planned Data Dawg query via existing SQL tools and format markdown
 * (no LLM rewrite).
 */

import { formatSuggestedHandlerAnswer } from "@/lib/data-dawg-suggested-handler-answer"
import {
  toolNchsaaMultiTimeStateChampions,
  toolNchsaaMultiTimeStatePlacers,
  toolNchsaaDualTeamChampions,
  toolNhscaMultiTimeAllAmericansByClass,
  toolPublicRankingsSearch,
  toolRecordBooksSearch,
  toolCollegeCommitsSearch,
  toolDaveSchultzAwardSearch,
  toolTriciaSaundersAwardSearch,
} from "./execute-data-tools"
import {
  appendSourceFooter,
  type PlannedDataDawgQuery,
} from "./query-planner"

function formatMultiTimeChampions(payload: {
  exact_title_count?: number
  total_wrestlers?: number
  champions?: Array<{
    wrestler_name?: string
    championships?: Array<{ year?: number; classification?: string; weight_class?: string }>
  }>
}): string {
  const champions = payload.champions ?? []
  const times = payload.exact_title_count ?? champions[0]?.championships?.length ?? 0
  const formatted = formatSuggestedHandlerAnswer({
    results: champions,
    queryType: "nchsaa_multi_time_state_champions",
  })
  if (formatted) return formatted
  if (!champions.length) {
    return `No ${times}× NCHSAA individual state champions found in the database.`
  }
  return `Found **${payload.total_wrestlers ?? champions.length}** ${times}× state champions.`
}

function formatMultiTimePlacers(payload: {
  exact_placement_count?: number
  total_wrestlers?: number
  placers?: Array<{
    wrestler_name?: string
    placement_count?: number
    placements?: Array<{ year?: number; place?: number; classification?: string; weight_class?: string }>
    schools?: string[]
    years_label?: string
  }>
}): string {
  const placers = payload.placers ?? []
  const formatted = formatSuggestedHandlerAnswer({
    results: placers,
    queryType: "nchsaa_multi_time_state_placers",
  })
  if (formatted) return formatted
  const times = payload.exact_placement_count ?? 0
  if (!placers.length) {
    return `No ${times}× NCHSAA state placers found in the database.`
  }
  return `Found **${payload.total_wrestlers ?? placers.length}** ${times}× state placers.`
}

function formatDualTeam(payload: Record<string, unknown>, leaderboard: boolean): string {
  if (leaderboard) {
    const schools = (payload.schools as Array<{ school?: string; title_count?: number; years?: number[] }> | undefined) ?? []
    const most = payload.most_titles as { school?: string; title_count?: number } | undefined
    if (!schools.length) {
      return "I could not build a dual team state titles leaderboard from `dual_team_champions` right now."
    }
    const top = schools.slice(0, 25).map((s, i) => {
      const years = (s.years ?? []).join(", ")
      const yearsBit = years ? ` (${years})` : ""
      return `${i + 1}. **${s.school}** — ${s.title_count ?? 0} title${(s.title_count ?? 0) !== 1 ? "s" : ""}${yearsBit}`
    })
    const head = most?.school
      ? `**${most.school}** has the most NCHSAA state dual team titles with **${most.title_count ?? 0}**.`
      : "NCHSAA state dual team titles by school:"
    return `**NCHSAA Dual Team State Titles — Leaderboard**\n\n${head}\n\n${top.join("\n")}`
  }

  const rows =
    (payload.champions as Array<{
      year?: number
      division?: string
      champion_school?: string
    }> | undefined) ??
    (payload.rows as Array<{
      year?: number
      division?: string
      champion_school?: string
    }> | undefined) ??
    []
  if (!rows.length) {
    return "No NCHSAA dual team state champions matched that filter."
  }
  const lines = rows.map((r) => {
    const div = r.division ? ` (${r.division})` : ""
    return `- **${r.year}**${div}: ${r.champion_school ?? "—"}`
  })
  return `**NCHSAA Dual Team State Champions**\n\n${lines.join("\n")}`
}

function ordinal(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? "—")
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function formatNhscaMultiTimeByClass(payload: Record<string, unknown>): string {
  const rows =
    (payload.rows as Array<{
      name?: string
      highschool?: string | null
      nhsca_all_american_count?: number
      results?: Array<{
        year?: number
        division?: string
        weight?: string | number | null
        placement?: number
      }>
    }> | undefined) ?? []
  const graduationYear = payload.graduation_year
  const times = Number(payload.times) || 0
  const exact = payload.exact !== false
  const total = Number(payload.total) || rows.length
  const countLabel = exact ? `${times}-time` : `at least ${times}-time`

  if (!rows.length) {
    return `I found **0** ${countLabel} NHSCA All-Americans in the North Carolina Class of ${graduationYear}.`
  }

  const lines = rows.map((row) => {
    const school = row.highschool ? ` — ${row.highschool}` : ""
    const details = (row.results ?? [])
      .map((r) => {
        const wt = r.weight != null && String(r.weight).trim() ? `, ${r.weight}` : ""
        const div = r.division ? ` ${r.division}` : ""
        return `${r.year}${div}${wt}: ${ordinal(r.placement)}`
      })
      .join("; ")
    const detailBit = details ? ` (${details})` : ""
    return `- **${row.name ?? "Unknown"}**${school} — ${row.nhsca_all_american_count ?? times} NHSCA AA${detailBit}`
  })

  return (
    `I found **${total}** ${countLabel} NHSCA All-American${total === 1 ? "" : "s"} ` +
    `in the North Carolina Class of ${graduationYear}.\n\n${lines.join("\n")}`
  )
}

function formatRankings(payload: Record<string, unknown>): string {
  if (payload.available_years && !payload.rankings) {
    const years = payload.available_years as number[]
    return `RecruitNC public prospect rankings are available for class years: **${years.join(", ")}** (top 20 per class).`
  }
  const rankings =
    (payload.rankings as Array<{
      rank?: number
      name?: string
      highschool?: string
      graduationyear?: number
      weightclass?: string | number
    }> | undefined) ?? []
  const year = payload.graduation_year ?? rankings[0]?.graduationyear
  if (!rankings.length) {
    return `No public prospect rankings found${year != null ? ` for the Class of ${year}` : ""}.`
  }
  const pageUrl = typeof payload.page_url === "string" ? payload.page_url : "/public-rankings"
  const lines = rankings.map((r) => {
    const school = r.highschool ? ` — ${r.highschool}` : ""
    const wt = r.weightclass != null && String(r.weightclass).trim() ? ` (${r.weightclass})` : ""
    return `${r.rank ?? "—"}. **${r.name ?? "Unknown"}**${school}${wt}`
  })
  return (
    `**RecruitNC Prospect Rankings${year != null ? ` — Class of ${year}` : ""}**\n\n` +
    `${lines.join("\n")}\n\n` +
    `Full list: ${pageUrl}`
  )
}

function formatRecordBooks(payload: Record<string, unknown>): string {
  const career = (payload.career_winningest as Array<Record<string, unknown>> | undefined) ?? []
  const single = (payload.single_season_winningest as Array<Record<string, unknown>> | undefined) ?? []
  const parts: string[] = []
  if (career.length) {
    parts.push("**Career Winningest Wrestlers**")
    parts.push(
      ...career.slice(0, 25).map((r) => {
        const rank = r.rank != null ? `${r.rank}. ` : ""
        const rec = r.record ? ` — ${r.record}` : ""
        const school = r.school ? ` (${r.school})` : ""
        const years = r.years ? ` [${r.years}]` : ""
        return `${rank}**${r.name ?? "Unknown"}**${school}${rec}${years}`
      }),
    )
  }
  if (single.length) {
    if (parts.length) parts.push("")
    parts.push("**Single-Season Most Victories**")
    parts.push(
      ...single.slice(0, 25).map((r) => {
        const rank = r.rank_numeric != null ? `${r.rank_numeric}. ` : ""
        const rec = r.record ? ` — ${r.record}` : r.wins != null ? ` — ${r.wins} wins` : ""
        const school = r.school ? ` (${r.school})` : ""
        const year = r.year ? ` [${r.year}]` : ""
        const ctx = typeof r.context === "string" && r.context.trim() ? `\n   ${r.context}` : ""
        return `${rank}**${r.wrestler_name ?? "Unknown"}**${school}${rec}${year}${ctx}`
      }),
    )
  }
  if (!parts.length) {
    return "No record-book rows matched that query."
  }
  return parts.join("\n")
}

function formatCommits(payload: Record<string, unknown>): string {
  const rows = (payload.rows as Array<Record<string, unknown>> | undefined) ?? []
  if (!rows.length) {
    return "No college commits matched that filter in the athletes directory."
  }
  const lines = rows.slice(0, 200).map((r) => {
    const fromParts = [r.firstname ?? r.first_name, r.lastname ?? r.last_name]
      .filter(Boolean)
      .join(" ")
    const name = String(r.name || fromParts || "Unknown")
    const school = r.highschool ?? r.high_school
    const schoolBit = school ? ` — ${school}` : ""
    const college = r.college ? ` → **${r.college}**` : ""
    const gy = r.graduationyear ?? r.graduation_year
    const gyBit = gy != null ? ` (Class of ${gy})` : ""
    const divisionBit = r.division ? ` [${r.division}]` : ""
    return `- **${name}**${schoolBit}${college}${divisionBit}${gyBit}`
  })
  const total = Number(payload.total_count) || rows.length
  const countLabel = total > rows.length ? `${rows.length} shown of ${total}` : `${rows.length}`
  return `**College Commits** (${countLabel})\n\n${lines.join("\n")}`
}

function formatAward(
  label: string,
  payload: Record<string, unknown>,
): string {
  const rows = (payload.rows as Array<Record<string, unknown>> | undefined) ?? []
  if (!rows.length) {
    return `No ${label} winners matched that filter.`
  }
  const lines = rows.slice(0, 100).map((r) => {
    const year = r.year != null ? `**${r.year}** — ` : ""
    const name = String(r.name ?? r.athlete_name ?? r.wrestler_name ?? "Unknown")
    const school = r.high_school || r.school || r.highschool
    const schoolBit = school ? ` (${school})` : ""
    return `- ${year}**${name}**${schoolBit}`
  })
  return `**${label} Winners**\n\n${lines.join("\n")}`
}

/**
 * Run a planned intent against SQL tools and return grounded markdown + source footer.
 * Returns null only if execution unexpectedly fails (caller should fall through).
 */
export async function executePlannedDataDawgQuery(
  plan: PlannedDataDawgQuery,
): Promise<{ answer: string; queryType: string } | null> {
  try {
    let body: string

    switch (plan.intent) {
      case "nchsaa_multi_time_state_champions": {
        const payload = await toolNchsaaMultiTimeStateChampions({ times: plan.times })
        body = formatMultiTimeChampions(payload)
        break
      }
      case "nchsaa_multi_time_state_placers": {
        const payload = await toolNchsaaMultiTimeStatePlacers({ times: plan.times })
        body = formatMultiTimePlacers(payload)
        break
      }
      case "nchsaa_dual_team_champions": {
        const payload = await toolNchsaaDualTeamChampions({
          year: plan.year,
          division: plan.division,
          school: plan.school,
          leaderboard: plan.leaderboard,
        })
        body = formatDualTeam(payload as Record<string, unknown>, plan.leaderboard)
        break
      }
      case "nhsca_multi_time_all_americans_by_class": {
        const payload = await toolNhscaMultiTimeAllAmericansByClass({
          graduation_year: plan.graduation_year,
          times: plan.times,
          exact: plan.exact,
        })
        body = formatNhscaMultiTimeByClass(payload as Record<string, unknown>)
        break
      }
      case "public_rankings_search": {
        const payload = await toolPublicRankingsSearch({
          graduation_year: plan.graduation_year ?? undefined,
          gender: plan.gender,
          limit: plan.limit ?? undefined,
          list_available_years: plan.list_available_years,
        })
        body = formatRankings(payload as Record<string, unknown>)
        break
      }
      case "record_books_search": {
        const payload = await toolRecordBooksSearch({
          mode: plan.mode,
          query: plan.query,
          min_wins: plan.min_wins,
          season: plan.season,
          school: plan.school,
        })
        body = formatRecordBooks(payload as Record<string, unknown>)
        break
      }
      case "college_commits_search": {
        const payload = await toolCollegeCommitsSearch({
          query: plan.query ?? undefined,
          college: plan.college ?? undefined,
          grad_year: plan.grad_year ?? undefined,
          gender: plan.gender ?? undefined,
          division: plan.division ?? undefined,
          limit: plan.limit,
        })
        body = formatCommits(payload as Record<string, unknown>)
        break
      }
      case "dave_schultz_award_search": {
        const payload = await toolDaveSchultzAwardSearch({
          query: plan.query,
          year: plan.year,
          limit: 200,
        })
        body = formatAward("Dave Schultz High School Excellence Award", payload as Record<string, unknown>)
        break
      }
      case "tricia_saunders_award_search": {
        const payload = await toolTriciaSaundersAwardSearch({
          query: plan.query,
          year: plan.year,
          limit: 200,
        })
        body = formatAward("Tricia Saunders High School Excellence Award", payload as Record<string, unknown>)
        break
      }
      default: {
        // Exhaustiveness — should not happen
        const _exhaustive: never = plan
        void _exhaustive
        return null
      }
    }

    return {
      answer: appendSourceFooter(body, plan.source),
      queryType: `planned_${plan.intent}`,
    }
  } catch (e) {
    console.warn(
      "[RecruitNC] planned query execute failed:",
      plan.intent,
      e instanceof Error ? e.message : e,
    )
    return null
  }
}
