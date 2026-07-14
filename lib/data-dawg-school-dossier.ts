/**
 * Full high-school wrestling dossier for Data Dawg v2 — NCHSAA, duals, NHSCA, Super32, Dave Schultz, MOW.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/server-supabase"
import { escapeForIlike } from "@/lib/nchsaa-results"
import {
  ilikeOrClause,
  nameSearchKeysForSchoolDossier,
  schoolDossierAthleteMatchesKnown,
  schoolIlikePatterns,
} from "@/lib/data-dawg-school-nhsca-match"
import { extractSearchablePhrase, stripConversationalNoise } from "@/lib/data-dawg-agent-v2/search-normalize"
import { levenshteinDistance, scoreSchoolMatch } from "@/lib/data-dawg-agent-v2/fuzzy-utils"

const MAX_NCHSAA = 2000
const MAX_NATIONAL = 900
const MAX_DAVE = 80
const MAX_SUPER32_LIST = 120

/** Same disambiguation as legacy chat (Chapel Hill vs East Chapel Hill). */
function getSchoolQueryPattern(schoolName: string): string {
  const normalized = schoolName.toLowerCase().trim()
  if (normalized === "chapel hill" || normalized === "east chapel hill") {
    return `${schoolName}%`
  }
  return `%${schoolName}%`
}

function isPrivateSchoolName(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.includes("academy") ||
    lower.includes("charter") ||
    lower.includes("christian") ||
    lower.includes("prep") ||
    lower.includes("preparatory") ||
    lower.includes("private")
  )
}

function schoolCellMatchesCanonical(cell: string, canonical: string): boolean {
  const a = (cell ?? "").toLowerCase().trim()
  const b = canonical.toLowerCase().trim()
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function mergeUniqueRows<T extends Record<string, unknown>>(
  rows: T[],
  keyFn: (r: T) => string,
): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    const k = keyFn(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

/** Display name from a loose athlete row (directory / import). */
function athleteDirectoryDisplayName(r: Record<string, unknown>): string {
  const n = String(r.name ?? "").trim()
  if (n) return n
  const f = String(r.firstName ?? r.first_name ?? r.firstname ?? "").trim()
  const l = String(r.lastName ?? r.last_name ?? r.lastname ?? "").trim()
  return `${f} ${l}`.trim()
}

function nhscaRowIncludeForSchool(
  row: Record<string, unknown>,
  canonical: string,
  knownWrestlers: string[],
): boolean {
  if (schoolCellMatchesCanonical(String(row.high_school ?? ""), canonical)) return true
  return schoolDossierAthleteMatchesKnown(String(row.athlete_name ?? ""), knownWrestlers)
}

/**
 * NHSCA imports often leave `high_school` blank or use a different spelling than NCHSAA — pull by athlete name
 * using the same variant expansion as profiles.
 */
async function fetchNhscaByKnownWrestlerNames(
  admin: SupabaseClient,
  knownWrestlers: string[],
): Promise<{ leg: Record<string, unknown>[]; plc: Record<string, unknown>[] }> {
  const list = nameSearchKeysForSchoolDossier(knownWrestlers)
  if (list.length === 0) return { leg: [], plc: [] }

  const leg: Record<string, unknown>[] = []
  const plc: Record<string, unknown>[] = []
  const CHUNK = 6
  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK)
    const orClause = ilikeOrClause("athlete_name", chunk)
    const [r1, r2] = await Promise.all([
      admin
        .from("wrestling_nhsca_results")
        .select("athlete_name,placement,year,division,weight,high_school,record")
        .or(orClause)
        .limit(500),
      admin
        .from("nhsca_placements")
        .select("athlete_name,placement,year,division,weight_class,high_school")
        .or(orClause)
        .limit(500),
    ])
    if (r1.error) {
      console.warn("[RecruitNC] school dossier NHSCA legacy by name:", r1.error.message)
    } else if (r1.data?.length) {
      leg.push(...(r1.data as Record<string, unknown>[]))
    }
    if (r2.error) {
      console.warn("[RecruitNC] school dossier nhsca_placements by name:", r2.error.message)
    } else if (r2.data?.length) {
      plc.push(...(r2.data as Record<string, unknown>[]))
    }
  }
  return { leg, plc }
}

/** Display weight like `107 lbs` (matches legacy Data Dawg / schools page style). */
function formatWeightLbs(weightRaw: unknown): string {
  const s = String(weightRaw ?? "")
    .replace(/lbs?$/i, "")
    .trim()
  if (!s) return ""
  return `${s} lbs`
}

function formatNchsaaLine(r: Record<string, unknown>): string {
  const name = String(r.wrestler_name ?? "").trim()
  const place = Number(r.place ?? 0)
  const year = r.year ?? "?"
  const cls = String(r.classification ?? "").trim()
  const w = formatWeightLbs(r.weight_class)
  const clsW = [cls, w].filter(Boolean).join(", ")
  if (place === 1) {
    return `- ${year}: ${name} — State Champion (${clsW})`
  }
  if (place >= 2 && place <= 6) {
    const ord = place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
    return `- ${year}: ${name} — ${ord} place (${clsW})`
  }
  if (place === 0) {
    return `- ${year}: ${name} — State qualifier (${clsW})`
  }
  return `- ${year}: ${name} (${clsW})`
}

function placementNum(p: unknown): number {
  if (typeof p === "number" && Number.isFinite(p)) return p
  const s = String(p ?? "").trim()
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : 0
}

function formatSuper32Line(r: Record<string, unknown>): string {
  const year = r.year ?? "?"
  const placement = placementNum(r.placement ?? r.place)
  const name = String(r.athlete_name ?? "").trim()
  const record =
    String(r.record ?? "").trim() ||
    (r.wins != null && r.losses != null ? `${r.wins}-${r.losses}` : "")
  const weightRaw = String(r.weight_class ?? r.weight ?? "")
    .replace(/lbs?$/i, "")
    .trim()
  let pt = ""
  if (placement === 1) pt = "Champion (All-American)"
  else if (placement >= 2 && placement <= 8) {
    pt = `${placement}${placement === 2 ? "nd" : placement === 3 ? "rd" : "th"} place (All-American)`
  } else if (placement > 0) pt = `${placement}th place`
  const mid = pt ? `${name} — ${pt}` : name
  let line = `- ${year}: ${mid}`
  if (record) line += ` — ${record}`
  if (weightRaw) line += ` — (${weightRaw})`
  return line
}

async function resolveCanonicalSchool(
  admin: SupabaseClient,
  phrase: string,
): Promise<{
  canonical: string
  classification: { classification: string | null; region: string | null; effective_year: number | null } | null
} | null> {
  const qLower = phrase.toLowerCase()
  const pattern = `%${escapeForIlike(phrase)}%`

  const [clsRes, nchsaaRes, athRes] = await Promise.all([
    admin
      .from("school_classifications")
      .select("school_name,classification,region,effective_year")
      .ilike("school_name", pattern)
      .limit(80),
    admin.from("wrestling_nchsaa_results").select("school").ilike("school", pattern).limit(500),
    admin
      .from("athletes")
      .select("highschool")
      .not("highschool", "is", null)
      .ilike("highschool", pattern)
      .limit(80),
  ])

  const counts = new Map<string, number>()
  for (const r of nchsaaRes.data ?? []) {
    const s = String((r as { school?: string }).school ?? "").trim()
    if (!s) continue
    counts.set(s, (counts.get(s) || 0) + 1)
  }

  const candidates = new Set<string>()
  for (const r of clsRes.data ?? []) {
    const n = String((r as { school_name?: string }).school_name ?? "").trim()
    if (n) candidates.add(n)
  }
  for (const k of counts.keys()) candidates.add(k)
  for (const r of athRes.data ?? []) {
    const n = String((r as { highschool?: string }).highschool ?? "").trim()
    if (n) candidates.add(n)
  }

  const list = [...candidates].filter(Boolean)
  if (list.length === 0) return null

  let best = list[0]
  let bestScore = -1
  for (const name of list) {
    const sc = scoreSchoolMatch(qLower, name)
    const freqBoost = Math.min(0.12, (counts.get(name) || 0) * 0.0015)
    const total = sc + freqBoost
    if (total > bestScore) {
      bestScore = total
      best = name
    }
  }
  if (bestScore < 0.32) {
    const sorted = [...list].sort(
      (a, b) => levenshteinDistance(qLower, a.toLowerCase()) - levenshteinDistance(qLower, b.toLowerCase()),
    )
    best = sorted[0]
  }

  let classification: {
    classification: string | null
    region: string | null
    effective_year: number | null
  } | null = null
  const clsRows = (clsRes.data ?? []) as Array<{
    school_name?: string
    classification?: string | null
    region?: string | null
    effective_year?: number | null
  }>
  const clsRow =
    clsRows.find((r) => String(r.school_name ?? "").toLowerCase() === best.toLowerCase()) ||
    clsRows.find((r) => {
      const sn = String(r.school_name ?? "").toLowerCase()
      return sn.includes(qLower) || qLower.includes(sn)
    })
  if (clsRow) {
    classification = {
      classification: clsRow.classification != null ? String(clsRow.classification) : null,
      region: clsRow.region != null ? String(clsRow.region) : null,
      effective_year: clsRow.effective_year != null ? Number(clsRow.effective_year) : null,
    }
  }

  return { canonical: best, classification }
}

export async function buildSchoolWrestlingDossierMarkdown(rawQuery: string): Promise<{
  markdown: string
  error?: string
  searched_for?: string
  canonical_school?: string
}> {
  const phrase = (extractSearchablePhrase(rawQuery) || stripConversationalNoise(rawQuery)).trim()
  if (phrase.length < 2) {
    return { markdown: "", error: "School name must be at least 2 characters.", searched_for: phrase }
  }

  const admin = getSupabaseAdmin()
  const resolved = await resolveCanonicalSchool(admin, phrase)
  if (!resolved) {
    return {
      markdown: `I could not find a high school matching **${phrase}** in classifications, state results, or rosters. Try the full official name (e.g. include "High School") or check spelling.`,
      searched_for: phrase,
    }
  }

  const { canonical, classification: clsMeta } = resolved
  const isPrivate = isPrivateSchoolName(canonical)
  const schoolPat = getSchoolQueryPattern(canonical)

  let n1 = admin
    .from("wrestling_nchsaa_results")
    .select("wrestler_name,place,year,classification,weight_class,school")
    .eq("school", canonical)
    .limit(MAX_NCHSAA)
  let n2 = admin
    .from("wrestling_nchsaa_results")
    .select("wrestler_name,place,year,classification,weight_class,school")
    .ilike("school", schoolPat)
    .limit(MAX_NCHSAA)
  if (!isPrivate) {
    n1 = n1.neq("classification", "NCISA")
    n2 = n2.neq("classification", "NCISA")
  }

  const [nr1, nr2, athletesRes, s321, s322, dualRes, daveRes, triciaRes, mowRes] = await Promise.all([
    n1,
    n2,
    admin.from("athletes").select("*").ilike("highschool", schoolPat).limit(300),
    admin
      .from("super32_results")
      .select("athlete_name,placement,year,high_school,school,weight_class,record,wins,losses")
      .ilike("high_school", schoolPat)
      .limit(MAX_NATIONAL),
    admin
      .from("super32_results")
      .select("athlete_name,placement,year,high_school,school,weight_class,record,wins,losses")
      .ilike("school", schoolPat)
      .limit(MAX_NATIONAL),
    admin
      .from("dual_team_champions")
      .select("year,division,champion_school,is_vacated")
      .ilike("champion_school", `%${escapeForIlike(canonical)}%`)
      .limit(200),
    admin
      .from("dave_schultz_award")
      .select("year,name,high_school")
      .ilike("high_school", schoolPat)
      .limit(MAX_DAVE),
    admin
      .from("tricia_saunders_award")
      .select("year,name,high_school")
      .ilike("high_school", schoolPat)
      .limit(MAX_DAVE),
    admin
      .from("most_outstanding_wrestlers")
      .select("name,school,division,year")
      .ilike("school", schoolPat)
      .limit(200),
  ])

  const nchsaaRows = mergeUniqueRows(
    [...(nr1.data ?? []), ...(nr2.data ?? [])] as Record<string, unknown>[],
    (r) =>
      `${String(r.wrestler_name)}|${String(r.year)}|${String(r.place)}|${String(r.weight_class ?? "")}|${String(r.school ?? "")}`,
  ).filter((r) => schoolCellMatchesCanonical(String(r.school ?? ""), canonical))

  const athleteAtSchoolNames = (athletesRes.data ?? [])
    .map((r) => r as Record<string, unknown>)
    .filter((r) => schoolCellMatchesCanonical(String(r.highschool ?? r.high_school ?? ""), canonical))
    .map((r) => athleteDirectoryDisplayName(r))
    .filter(Boolean)

  const nchsaaWrestlerNames = nchsaaRows
    .map((r) => String(r.wrestler_name ?? "").trim())
    .filter(Boolean)

  const knownWrestlers = [...new Set([...nchsaaWrestlerNames, ...athleteAtSchoolNames])]

  const schoolPats = schoolIlikePatterns(canonical)
  const nhscaSchoolQueries = schoolPats.flatMap((pat) => [
    admin
      .from("wrestling_nhsca_results")
      .select("athlete_name,placement,year,division,weight,high_school,record")
      .ilike("high_school", pat)
      .limit(MAX_NATIONAL),
    admin
      .from("nhsca_placements")
      .select("athlete_name,placement,year,division,weight_class,high_school")
      .ilike("high_school", pat)
      .limit(MAX_NATIONAL),
  ])

  const [nhEq, schoolOnlyRes, nhByName] = await Promise.all([
    admin
      .from("wrestling_nhsca_results")
      .select("athlete_name,placement,year,division,weight,high_school,record")
      .eq("high_school", canonical)
      .limit(MAX_NATIONAL),
    Promise.all(nhscaSchoolQueries),
    fetchNhscaByKnownWrestlerNames(admin, knownWrestlers),
  ])

  const legFromSchool: Record<string, unknown>[] = [
    ...((nhEq.data ?? []) as Record<string, unknown>[]),
  ]
  const plcFromSchool: Record<string, unknown>[] = []
  for (let i = 0; i < schoolOnlyRes.length; i++) {
    const res = schoolOnlyRes[i]!
    if (res.error) {
      console.warn("[RecruitNC] school dossier NHSCA school query:", res.error.message)
      continue
    }
    const rows = (res.data ?? []) as Record<string, unknown>[]
    // Even indices = legacy table, odd = placements (see schoolPats.flatMap order)
    if (i % 2 === 0) legFromSchool.push(...rows)
    else plcFromSchool.push(...rows)
  }

  const nhMerged = mergeUniqueRows(
    [...legFromSchool, ...nhByName.leg],
    (r) =>
      `${String(r.athlete_name)}|${String(r.year)}|${String(placementNum(r.placement))}|${String(r.division ?? "")}|${String(r.weight ?? "")}`,
  ).filter((r) => nhscaRowIncludeForSchool(r, canonical, knownWrestlers))

  const npRows = mergeUniqueRows(
    [...plcFromSchool, ...nhByName.plc],
    (r) =>
      `${String(r.athlete_name)}|${String(r.year)}|${String(placementNum(r.placement))}|${String(r.division ?? "")}|${String(r.weight_class ?? "")}`,
  ).filter((r) => nhscaRowIncludeForSchool(r, canonical, knownWrestlers))

  const nhscaCombined = mergeUniqueRows(
    [...nhMerged, ...npRows],
    (r) =>
      `${String(r.athlete_name)}|${String(r.year)}|${String(placementNum(r.placement))}|${String(r.division ?? "")}|${String(r.weight ?? r.weight_class ?? "")}`,
  )

  const super32Rows = mergeUniqueRows(
    [...(s321.data ?? []), ...(s322.data ?? [])] as Record<string, unknown>[],
    (r) =>
      `${String(r.athlete_name)}|${String(r.year)}|${String(placementNum(r.placement))}|${String(r.high_school ?? "")}|${String(r.school ?? "")}`,
  ).filter(
    (r) =>
      schoolCellMatchesCanonical(String(r.high_school ?? ""), canonical) ||
      schoolCellMatchesCanonical(String(r.school ?? ""), canonical) ||
      schoolDossierAthleteMatchesKnown(String(r.athlete_name ?? ""), knownWrestlers),
  )

  const dualFiltered = (dualRes.data ?? []).filter(
    (d: Record<string, unknown>) =>
      !d.is_vacated && schoolCellMatchesCanonical(String(d.champion_school ?? ""), canonical),
  )

  const daveFiltered = (daveRes.data ?? []).filter((d: Record<string, unknown>) =>
    schoolCellMatchesCanonical(String(d.high_school ?? ""), canonical),
  )

  const triciaFiltered = ((triciaRes.data ?? []) as Record<string, unknown>[]).filter((d) =>
    schoolCellMatchesCanonical(String(d.high_school ?? ""), canonical),
  )

  const mowFiltered = (mowRes.data ?? []).filter((m: Record<string, unknown>) =>
    schoolCellMatchesCanonical(String(m.school ?? ""), canonical),
  )

  const lines: string[] = []
  lines.push(`${canonical}`)
  lines.push("")

  if (clsMeta?.classification || clsMeta?.region) {
    const eff =
      clsMeta.effective_year != null && Number.isFinite(clsMeta.effective_year)
        ? ` (effective ${clsMeta.effective_year})`
        : ""
    const clsPart = clsMeta.classification ? String(clsMeta.classification).trim() : ""
    const regionPart =
      clsMeta.region && String(clsMeta.region).trim()
        ? ` · Region ${String(clsMeta.region).trim()}`
        : ""
    const summary = [clsPart + regionPart].filter(Boolean).join("")
    if (summary) {
      lines.push(`Classification: ${summary}${eff}`)
      lines.push("")
    }
  }

  lines.push("NCHSAA Individual Tournament")
  lines.push("")
  if (nchsaaRows.length === 0) {
    lines.push("*No individual tournament results on file for this school in the matched data.*")
  } else {
    const sorted = [...nchsaaRows].sort((a, b) => {
      const ya = Number(a.year) || 0
      const yb = Number(b.year) || 0
      if (yb !== ya) return yb - ya
      return (Number(a.place) || 99) - (Number(b.place) || 99)
    })
    const champs = sorted.filter((r) => Number(r.place) === 1)
    const other = sorted.filter((r) => Number(r.place) !== 1)
    lines.push(`State Champions (${champs.length}):`)
    lines.push("")
    if (champs.length === 0) lines.push("*None in the database for this school.*")
    else {
      for (const r of champs) lines.push(formatNchsaaLine(r))
    }
    lines.push("")
    lines.push(`Other State Placements (${other.length}):`)
    lines.push("")
    if (other.length === 0) lines.push("*No other placers or qualifiers beyond state champions in these rows.*")
    else {
      for (const r of other.slice(0, 400)) lines.push(formatNchsaaLine(r))
      if (other.length > 400) {
        lines.push("")
        lines.push(`_…and ${other.length - 400} more placements (truncated)._`)
      }
    }
  }

  lines.push("")
  lines.push("Dual Team — NCHSAA State Champions")
  lines.push("")
  if (dualFiltered.length === 0) {
    lines.push("*No dual-team state titles matched this school name.*")
  } else {
    const sortedDual = [...dualFiltered].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(b.year) || 0) - (Number(a.year) || 0),
    )
    for (const d of sortedDual) {
      lines.push(
        `- ${d.year}: ${String(d.champion_school ?? "").trim()} — ${String(d.division ?? "").trim()}`,
      )
    }
  }

  lines.push("")
  lines.push("NHSCA Nationals (All-Americans & results)")
  lines.push("")
  if (nhscaCombined.length === 0) {
    lines.push("*No NHSCA rows matched this high school.*")
  } else {
    const sortedN = [...nhscaCombined].sort((a, b) => {
      const ya = Number(a.year) || 0
      const yb = Number(b.year) || 0
      if (yb !== ya) return yb - ya
      const pa = placementNum(a.placement)
      const pb = placementNum(b.placement)
      const aaA = pa >= 1 && pa <= 8 ? 0 : 1
      const aaB = pb >= 1 && pb <= 8 ? 0 : 1
      if (aaA !== aaB) return aaA - aaB
      return (pa || 99) - (pb || 99)
    })
    for (const r of sortedN) {
      const p = placementNum(r.placement)
      const nm = String(r.athlete_name ?? "").trim()
      const div = String(r.division ?? "").trim()
      const wt = formatWeightLbs(r.weight ?? r.weight_class)
      const rec = String((r as { record?: string }).record ?? "").trim()
      const aa = p >= 1 && p <= 8 ? " (All-American)" : ""
      const placeStr =
        p === 1
          ? "Champion"
          : p >= 2 && p <= 8
            ? `${p}${p === 2 ? "nd" : p === 3 ? "rd" : "th"}`
            : rec
              ? "Record"
              : "Competed"
      const extras = [div, wt, rec].filter(Boolean).join(", ")
      lines.push(`- ${r.year}: ${nm} — ${placeStr}${aa}${extras ? ` (${extras})` : ""}`)
    }
  }

  lines.push("")
  lines.push("Super32 (All-Americans)")
  lines.push("")
  const aaOnly = super32Rows.filter((r) => {
    const p = placementNum(r.placement ?? r.place)
    return p >= 1 && p <= 8
  })
  if (aaOnly.length === 0) {
    lines.push("*No Super32 top-8 (All-American) rows matched this school.*")
  } else {
    const sortedS = [...aaOnly].sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
    for (const r of sortedS.slice(0, MAX_SUPER32_LIST)) lines.push(formatSuper32Line(r))
    if (sortedS.length > MAX_SUPER32_LIST) {
      lines.push("")
      lines.push(`_…and ${sortedS.length - MAX_SUPER32_LIST} more Super32 rows (truncated)._`)
    }
  }

  lines.push("")
  lines.push("Dave Schultz High School Excellence Award")
  lines.push("")
  if (daveFiltered.length === 0) {
    lines.push("*No Dave Schultz award winners matched this school.*")
  } else {
    const sortedD = [...daveFiltered].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(b.year) || 0) - (Number(a.year) || 0),
    )
    for (const d of sortedD) {
      lines.push(`- ${d.year}: ${String(d.name ?? "").trim()} (${String(d.high_school ?? "").trim()})`)
    }
  }

  lines.push("")
  lines.push("Tricia Saunders High School Excellence Award")
  lines.push("")
  if (triciaFiltered.length === 0) {
    lines.push("*No Tricia Saunders award winners matched this school.*")
  } else {
    const sortedT = [...triciaFiltered].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(b.year) || 0) - (Number(a.year) || 0),
    )
    for (const d of sortedT) {
      lines.push(`- ${d.year}: ${String(d.name ?? "").trim()} (${String(d.high_school ?? "").trim()})`)
    }
  }

  lines.push("")
  lines.push("NCHSAA State Tournament — Most Outstanding Wrestler")
  lines.push("")
  if (mowFiltered.length === 0) {
    lines.push("*No tournament MOW rows matched this school.*")
  } else {
    const sortedM = [...mowFiltered].sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        (Number(b.year) || 0) - (Number(a.year) || 0),
    )
    for (const m of sortedM) {
      lines.push(
        `- ${m.year}: ${String(m.name ?? "").trim()} — ${String(m.division ?? "").trim()} (${String(m.school ?? "").trim()})`,
      )
    }
  }

  lines.push("")
  lines.push("---")
  lines.push(`_🔍 Matched: **${canonical}** · Search: "${phrase}"_`)

  return { markdown: lines.join("\n"), searched_for: phrase, canonical_school: canonical }
}
