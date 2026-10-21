#!/usr/bin/env npx tsx
/**
 * Do the stars predict where a wrestler signs? (Matt, 19-21 October 2026.)
 *
 * Matt's meaning of a star is the college level it projects: 5 = Division I tier 1, 4 = Division I
 * tier 2, 3 = Division II and top-ranked Division III, 2 = NAIA and the rest of Division III. Every
 * committed North Carolina boy is a labelled example of that, so this rates each one with the real
 * star code and sets the result against the level he signed at. Read-only: writes a JSON report.
 *
 * Tier 1 = a Division I program in the NWCA's current Division I poll (top 25). Top Division III =
 * ranked in the current Division III poll. Divisions come from programs-2026-27.json (the college
 * map), not `colleges.division`.
 *
 * The class-ranking third: graduated classes have no published rank any more, so their formula
 * rank stands in for it (the same rank the class board would have recommended).
 *
 *   RESULT_LINKS_READ=1 npx tsx --conditions=react-server scripts/calibrate-stars-vs-commitments.ts <out.json>
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const OUT = process.argv[2] ?? "star-calibration.json"
const CLASSES = [2025, 2026, 2027, 2028]

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’'`.,()-]/g, " ")
    .replace(/\b(university|college|the|of|at|community|state university)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { loadStarRatingInput } = await import("../lib/athlete-star-rating-load")
  const { rateAthlete } = await import("../lib/athlete-star-rating")
  const { loadNationallyRankedIds } = await import("../lib/national-rankings")
  const { loadOpponentIndex } = await import("../lib/scouting-report")
  const { loadStatePlacerIndex } = await import("../lib/state-placers")
  const { buildRecruitNcRankingBoard } = await import("../lib/rankings/recruitnc-ranking-engine")
  const { readTeamRankings } = await import("../lib/college-programs/team-rankings-snapshot")
  const programs = JSON.parse(fs.readFileSync("lib/college-programs/programs-2026-27.json", "utf8")).schools as Array<{
    id: string
    name: string
    programs: Array<{ division: string; mens: boolean }>
  }>

  const polls = await readTeamRankings()
  const d1Ranked = new Set((polls?.rankings ?? []).filter((r) => r.gender === "mens" && r.scope === "NCAA Division I").map((r) => r.schoolId))
  const d3Ranked = new Set((polls?.rankings ?? []).filter((r) => r.gender === "mens" && r.scope === "NCAA Division III").map((r) => r.schoolId))
  console.log(`polls: D1 ranked ${d1Ranked.size}, D3 ranked ${d3Ranked.size}`)

  const byName = new Map<string, (typeof programs)[number]>()
  for (const s of programs) byName.set(norm(s.name), s)
  // How profiles write a few colleges the map names differently.
  const ALIASES: Record<string, string> = {
    "unc pembroke": "university-of-north-carolina-at-pembroke",
    "minnesota west": "minnesota-west-community-technical-college",
    "rochester": "rochester-christian-university",
  }
  const findSchool = (college: string) => {
    const k = norm(college)
    const alias = ALIASES[k]
    if (alias) return programs.find((s) => s.id === alias) ?? null
    if (byName.has(k)) return byName.get(k)!
    // "Appalachian State" vs "Appalachian State University", "UNC Pembroke" vs "University of North Carolina at Pembroke"
    const hits = programs.filter((s) => {
      const n = norm(s.name)
      return n.includes(k) || k.includes(n)
    })
    return hits.length === 1 ? hits[0]! : null
  }

  const levelOf = (college: string): { level: string; target: number; school: string | null } => {
    const s = findSchool(college)
    if (!s) return { level: "unmatched", target: 0, school: null }
    const men = s.programs.find((p) => p.mens) ?? s.programs[0]
    const div = men?.division ?? ""
    if (div === "NCAA Division I") return d1Ranked.has(s.id) ? { level: "D1 tier 1", target: 5, school: s.name } : { level: "D1 tier 2", target: 4, school: s.name }
    if (div === "NCAA Division II") return { level: "D2", target: 3, school: s.name }
    if (div === "NCAA Division III") return d3Ranked.has(s.id) ? { level: "D3 ranked", target: 3, school: s.name } : { level: "D3", target: 2, school: s.name }
    if (div === "NAIA") return { level: "NAIA", target: 2, school: s.name }
    if (div === "NJCAA") return { level: "NJCAA", target: 2, school: s.name }
    return { level: div || "unknown", target: 0, school: s.name }
  }

  const [rankedIds, baseIndex, stateIndex] = await Promise.all([
    loadNationallyRankedIds(sb),
    loadOpponentIndex(sb),
    loadStatePlacerIndex(sb).catch(() => ({ statePlacers: [], stateSchools: [], fargoAllAmericans: [] })),
  ])
  const opponentIndex = { ...baseIndex, ...stateIndex }

  const rows: Array<Record<string, unknown>> = []
  for (const year of CLASSES) {
    const board = await buildRecruitNcRankingBoard({ supabase: sb, year: String(year), gender: "Male" })
    const formulaRank = new Map(board.map((a) => [String(a.id), a.ai_rank]))
    const { data: athletes } = await sb
      .from("athletes")
      .select("*")
      .eq("graduationyear", year)
      .eq("gender", "Male")
      .eq("is_nc_athlete", true)
      .not("college", "is", null)
      .neq("college", "")
    for (const a of athletes ?? []) {
      const college = String(a.college ?? "").trim()
      if (!college || /^(undecided|tbd|none|n\/a)$/i.test(college)) continue
      const lvl = levelOf(college)
      const input = await loadStarRatingInput(sb, a as Record<string, unknown>, rankedIds, opponentIndex)
      // Graduated classes: no published rank survives, so the formula's rank stands in.
      const graduated = year <= 2026
      const fr = formulaRank.get(String(a.id)) ?? null
      const usedInput = graduated ? { ...input, prospectRanking: fr, rankingPublished: fr != null && fr <= 30 } : input
      const rating = rateAthlete(usedInput)
      const noRank = rateAthlete({ ...input, prospectRanking: null, rankingPublished: false })
      rows.push({
        id: a.id,
        name: a.name,
        class: year,
        college,
        school: lvl.school,
        level: lvl.level,
        target: lvl.target,
        stars: rating.stars,
        score: rating.score,
        floor: rating.floor ?? null,
        components: Object.fromEntries(rating.components.map((c) => [c.key, c.points])),
        scoreWithoutRanking: noRank.score,
        formulaRank: fr,
        publishedRank: a.prospect_ranking ?? null,
        nationallyRanked: input.nationallyRanked,
      })
    }
    console.log(`${year}: ${rows.filter((r) => r.class === year).length} committed`)
  }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1))
  console.log(`wrote ${rows.length} to ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
