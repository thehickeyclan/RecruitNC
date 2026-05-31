/**
 * Full athlete dossier for Data Dawg v2 — same sources as unified profile / legacy chat format.
 * One module so chat does not depend on route.ts.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { getAthleteProfileUrl } from "@/lib/athlete-profile-links"
import { escapeForIlike } from "@/lib/nchsaa-results"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { type NchsaaRowForProfile } from "@/lib/profile-tournament-data"
import { type TournamentResultForDisplay } from "@/lib/public-profile-data"
import { countDistinctStateTitleYears } from "@/lib/nchsaa-state-display"
import { namesMatch } from "@/lib/nhsca-live/names-match"
import { getUltimateClubDualsFromTables } from "@/lib/tournament-tables"

function athleteDisplayName(row: Record<string, unknown>): string {
  const n = String(row.name ?? "").trim()
  if (n) return n
  const f = String(row.first_name ?? row.firstName ?? "").trim()
  const l = String(row.last_name ?? row.lastName ?? "").trim()
  return `${f} ${l}`.trim() || "Unknown"
}

function formatNchsaaStateLine(r: NchsaaRowForProfile): string {
  const weight = (r.weight_class || "").toString().replace(/lbs?$/i, "").trim()
  const w = weight ? `${weight}lbs` : ""
  const cls = (r.classification || "").toString()
  if (r.place === 1) {
    return `- ${r.year}: State Champion (${cls}${w ? `, ${w}` : ""})`
  }
  if (r.place != null && r.place > 1 && r.place <= 6) {
    const placeText = r.place === 2 ? "2nd" : r.place === 3 ? "3rd" : `${r.place}th`
    return `- ${r.year}: ${placeText} place (${cls}${w ? `, ${w}` : ""})`
  }
  if (r.place === 0) {
    return `- ${r.year}: State qualifier (${cls}${w ? `, ${w}` : ""})`
  }
  return `- ${r.year}: (${cls}${w ? `, ${w}` : ""})`
}

function formatNhscaDisplayLine(r: TournamentResultForDisplay): string {
  const rec = r.record?.trim() ? ` (${r.record})` : ""
  const div = (r.division ?? "").trim()
  const w = (r.weight ?? "").toString().replace(/lbs?$/i, "").trim()
  const divW = [div && `${div}, `, w ? `${w}lbs` : ""].filter(Boolean).join("")
  return `- ${r.year}: ${r.placement}${rec}${divW ? ` (${divW.replace(/, $/, "")})` : ""}`
}

function formatSuper32Row(r: Record<string, unknown>): string {
  const year = r.year ?? "?"
  const placement = parseInt(String(r.placement ?? r.place ?? 0), 10) || 0
  const record =
    r.record?.toString().trim() ||
    (r.wins != null && r.losses != null ? `(${r.wins}-${r.losses})` : "")
  const weight = (r.weight_class ?? r.weight ?? "").toString()
  const isAA = placement >= 1 && placement <= 8
  if (isAA && placement >= 1) {
    const pt =
      placement === 1
        ? "Champion (All-American)"
        : `${placement}${placement === 2 ? "nd" : placement === 3 ? "rd" : "th"} place (All-American)`
    return `- ${year}: ${pt}${record ? ` ${record}` : ""}${weight ? ` (${weight})` : ""}`
  }
  return `- ${year}:${record ? ` ${record}` : ""}${weight ? ` (${weight})` : ""}`
}

/** Directory name vs tournament row (handles "Last, First" in DB). */
function dossierNamesMatch(directoryFullName: string, rowName: string): boolean {
  const dtrim = directoryFullName.trim()
  const rtrim = rowName.trim()
  if (!dtrim || !rtrim) return false
  if (namesMatch(dtrim, rtrim)) return true
  const comma = rtrim.indexOf(",")
  if (comma > 0) {
    const last = rtrim.slice(0, comma).trim()
    const rest = rtrim.slice(comma + 1).trim()
    if (last && rest) {
      const flipped = `${rest} ${last}`
      if (namesMatch(dtrim, flipped)) return true
    }
  }
  return false
}

/**
 * Build legacy-style Markdown dossier for one athlete id (RecruitNC DB).
 */
export async function buildAthleteDossierMarkdown(athleteId: string): Promise<{ markdown: string; error?: string }> {
  const id = (athleteId ?? "").trim()
  if (!id || id.length < 8) {
    return { markdown: "", error: "Invalid athlete id." }
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error: fetchErr } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle()

  if (fetchErr) {
    return { markdown: "", error: fetchErr.message }
  }
  if (!row) {
    return { markdown: "", error: "Athlete not found." }
  }

  const athlete = row as Record<string, unknown>
  const displayName = athleteDisplayName(athlete)
  const nameForQueries = displayName
  const highSchool = String(athlete.highschool ?? athlete.high_school ?? "").trim()
  const rawGrad = athlete.graduationyear ?? athlete.grad_year
  const hasValidGrad =
    rawGrad != null &&
    String(rawGrad).trim() !== "" &&
    Number.isFinite(Number(rawGrad)) &&
    Number(rawGrad) >= 1990 &&
    Number(rawGrad) <= 2050
  const gradYear = hasValidGrad ? Math.floor(Number(rawGrad)) : new Date().getFullYear()

  /** Earliest NCHSAA season year we query (≈ freshman spring through grad year + 1). Same for school dual / MOW. */
  const yearMin = hasValidGrad ? gradYear - 4 : 1990
  const yearMax = hasValidGrad ? gradYear + 1 : 2035

  const [{ nchsaa: nchsaaMerged, nhsca: nhscaDisplay }, ncUnited] = await Promise.all([
    loadAthleteTournamentBundle(supabase, athlete, { nhscaAllTime: true }),
    getUltimateClubDualsFromTables(supabase, nameForQueries, highSchool || undefined),
  ])

  const nchsaaSorted = [...nchsaaMerged].sort((a, b) => b.year - a.year)

  const lines: string[] = []
  const linkedName = `[${displayName}](${getAthleteProfileUrl(id)})`
  lines.push(`Here's what I found about ${linkedName}:`, "")

  if (highSchool) {
    lines.push(`🏛️ High School: ${highSchool}`)
  }

  const college = String(athlete.college ?? "").trim()
  const division = String(athlete.division ?? "").trim()
  if (college) {
    const divPart = division && !college.toLowerCase().includes(division.toLowerCase()) ? ` (${division})` : ""
    lines.push(`🎓 College: ${college}${divPart}`)
  }

  lines.push("")
  lines.push("🏆 NCHSAA State Results:")
  if (nchsaaSorted.length === 0) {
    lines.push("None")
  } else {
    for (const r of nchsaaSorted) {
      lines.push(formatNchsaaStateLine(r))
    }
  }

  let stateDualLines: string[] = []
  if (highSchool) {
    const { data: dualRows } = await supabase
      .from("dual_team_champions")
      .select("year, division, champion_school, is_vacated")
      .gte("year", yearMin)
      .lte("year", yearMax)
      .eq("is_vacated", false)
      .order("year", { ascending: false })

    const hsLower = highSchool.toLowerCase()
    const filtered = (dualRows ?? []).filter((d: Record<string, unknown>) => {
      const ch = String(d.champion_school ?? "").toLowerCase().trim()
      return ch === hsLower || ch.includes(hsLower) || hsLower.includes(ch)
    })
    stateDualLines = filtered.map(
      (d: Record<string, unknown>) =>
        `- ${d.year}: State Dual Team Champion (${d.division})`,
    )
  }

  if (stateDualLines.length > 0) {
    lines.push("")
    lines.push("🏆 State Dual Team Championships:")
    lines.push(
      `_(School team championships — everyone on the ${highSchool} varsity in this class window shares this list. Individual MOW below matches the **named** wrestler only.)_`,
    )
    stateDualLines.forEach((l) => lines.push(l))
  }

  const { data: mowRows } = await supabase
    .from("dual_team_champions")
    .select("year, division, mow_name, mow_school, mow_weight_lb")
    .not("mow_name", "is", null)
    .gte("year", yearMin)
    .lte("year", yearMax)
    .order("year", { ascending: false })
    .limit(200)

  const mowFiltered = (mowRows ?? []).filter((m: Record<string, unknown>) => {
    const mn = String(m.mow_name ?? "").trim()
    return mn.length > 0 && dossierNamesMatch(nameForQueries, mn)
  })

  if (mowFiltered.length > 0) {
    lines.push("")
    lines.push("🏆 State Duals Most Outstanding Wrestler (MOW):")
    for (const m of mowFiltered) {
      const w = m.mow_weight_lb ? ` (${m.mow_weight_lb}lbs)` : ""
      const who = String(m.mow_name ?? "").trim()
      lines.push(`- ${m.year}: ${m.division} Dual Meet MOW — **${who}**${w} (${m.mow_school})`)
    }
  }

  const super32Rows = [...tournament.super32].sort((a: any, b: any) => (b.year || 0) - (a.year || 0))
  lines.push("")
  lines.push("🏆 Super32:")
  if (super32Rows.length === 0) {
    lines.push("None")
  } else {
    for (const r of super32Rows) {
      lines.push(formatSuper32Row(r as Record<string, unknown>))
    }
  }

  lines.push("")
  lines.push("🌟 NHSCA Nationals:")
  if (nhscaDisplay.length === 0) {
    lines.push("None")
  } else {
    const seen = new Set<string>()
    for (const r of nhscaDisplay) {
      const key = `${r.year}-${r.placement}-${r.weight}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push(formatNhscaDisplayLine(r))
    }
  }

  lines.push("")
  lines.push("🇺🇸 NC United National Team:")
  if (ncUnited.length === 0) {
    lines.push("None")
  } else {
    for (const r of ncUnited) {
      const label =
        r.event?.includes("NHSCA") || r.event?.includes("National Duals")
          ? "NHSCA Duals"
          : "UCD (Ultimate Club Duals)"
      lines.push(`- **${r.year}** — ${label} — ${r.record}`)
    }
  }

  const daveLast = nameForQueries.toLowerCase().split(/\s+/).filter(Boolean).pop() ?? ""
  const { data: daveRows } = await supabase
    .from("dave_schultz_award")
    .select("year, name, high_school")
    .ilike("name", `%${escapeForIlike(daveLast)}%`)
    .gte("year", yearMin)
    .lte("year", yearMax)
    .order("year", { ascending: false })
    .limit(40)

  const daveFiltered = (daveRows ?? []).filter((d: Record<string, unknown>) =>
    dossierNamesMatch(nameForQueries, String(d.name ?? "").trim()),
  )

  if (daveFiltered.length > 0) {
    lines.push("")
    lines.push("🏅 Dave Schultz High School Excellence Award:")
    for (const d of daveFiltered) {
      lines.push(`- ${d.year}: Winner (${d.high_school})`)
    }
  }

  const { data: matchRows } = await supabase.from("matches").select("*").eq("athlete_id", id)

  const seasons = new Map<string, { wins: number; losses: number }>()
  for (const m of matchRows ?? []) {
    const mr = m as Record<string, unknown>
    const season = String(mr.season ?? mr.grade ?? "").toLowerCase()
    if (!season || season.includes("career")) continue
    if (!seasons.has(season)) seasons.set(season, { wins: 0, losses: 0 })
    const rec = seasons.get(season)!
    rec.wins += Number(mr.wins ?? 0) || 0
    rec.losses += Number(mr.losses ?? 0) || 0
  }

  if (seasons.size > 0) {
    lines.push("")
    lines.push("📊 High School Career Record:")
    let totalW = 0
    let totalL = 0
    const sortedSeasons = Array.from(seasons.entries()).sort((a, b) => {
      const ya = parseInt(a[0].match(/(\d{4})/)?.[1] ?? "0", 10)
      const yb = parseInt(b[0].match(/(\d{4})/)?.[1] ?? "0", 10)
      return yb - ya
    })
    for (const [season, rec] of sortedSeasons) {
      totalW += rec.wins
      totalL += rec.losses
      const sd = season.charAt(0).toUpperCase() + season.slice(1)
      lines.push(`- ${sd}: ${rec.wins}-${rec.losses}`)
    }
    if (sortedSeasons.length > 1) {
      lines.push(`- Career Total: ${totalW}-${totalL}`)
    }
  }

  const champCount = countDistinctStateTitleYears(nchsaaSorted)
  if (champCount >= 2) {
    lines.push("")
    lines.push(`🏆 ${champCount}× State Champion${champCount === 4 ? " — one of NC's elite four-time state champions" : ""}`)
  }

  return { markdown: lines.join("\n") }
}
