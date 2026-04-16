/**
 * Read-only Supabase tools for Data Dawg Agent v2.
 * Athlete + school search: conversational stripping, multi-strategy SQL, Levenshtein re-rank for typos.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { escapeForIlike } from "@/lib/nchsaa-results"
import {
  extractSearchablePhrase,
  stripConversationalNoise,
  tokenizeMeaningfulWords,
} from "./search-normalize"
import { levenshteinDistance, scoreAthleteNameMatch, scoreSchoolMatch } from "./fuzzy-utils"
import { buildAthleteDossierMarkdown } from "@/lib/data-dawg-athlete-dossier"

const MAX_ROWS = 40
const MAX_Q_LEN = 120
const FUZZY_POOL = 260

/** RecruitNC `athletes` table uses camelCase columns in Postgres (firstName, lastName, graduationyear). */
const AFN = "firstName"
const ALN = "lastName"
const AGY = "graduationyear"

function sanitizeFragment(q: string): string {
  return q.replace(/%/g, "").replace(/,/g, " ").trim().slice(0, MAX_Q_LEN)
}

const ATHLETE_SELECT = `id,name,${AFN},${ALN},highschool,${AGY},college,division`

function athleteDisplayName(row: Record<string, unknown>): string {
  const full = String(row.name ?? "").trim()
  if (full) return full
  const f = String(row[AFN] ?? row.first_name ?? "").trim()
  const l = String(row[ALN] ?? row.last_name ?? "").trim()
  return `${f} ${l}`.trim()
}

function rowFirst(row: Record<string, unknown>): string {
  return String(row[AFN] ?? row.first_name ?? "").trim()
}

function rowLast(row: Record<string, unknown>): string {
  return String(row[ALN] ?? row.last_name ?? "").trim()
}

export async function toolSearchAthletes(args: { query: string; limit?: number }) {
  const raw = sanitizeFragment(args.query || "")
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), MAX_ROWS)
  const phrase = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const q = phrase.trim()
  if (q.length < 2) {
    return { error: "Query must be at least 2 characters (after removing phrases like 'who is').", rows: [] as unknown[] }
  }

  const admin = getSupabaseAdmin()
  const base = () => admin.from("athletes").select(ATHLETE_SELECT)
  const pattern = `%${escapeForIlike(q)}%`

  const [a, b, c, nFull] = await Promise.all([
    base().ilike(AFN, pattern).limit(limit),
    base().ilike(ALN, pattern).limit(limit),
    base().ilike("highschool", pattern).limit(limit),
    // Many profiles store only `name` (combined); first/last can be empty — match "Liam Hickey" here.
    base().ilike("name", pattern).limit(limit),
  ])
  const err = a.error || b.error || c.error || nFull.error
  if (err) {
    return { error: err.message, rows: [] as unknown[] }
  }

  const byId = new Map<string, Record<string, unknown>>()
  const pushRows = (rows: Record<string, unknown>[] | null | undefined) => {
    for (const row of rows ?? []) {
      const id = String((row as { id?: string }).id ?? "")
      if (id && !byId.has(id)) byId.set(id, row)
    }
  }
  pushRows(a.data as Record<string, unknown>[])
  pushRows(b.data as Record<string, unknown>[])
  pushRows(c.data as Record<string, unknown>[])
  pushRows(nFull.data as Record<string, unknown>[])

  const tokens = tokenizeMeaningfulWords(raw)
  if (tokens.length >= 2) {
    const t0 = tokens[0]
    const t1 = tokens[tokens.length - 1]
    const p0 = `%${escapeForIlike(t0)}%`
    const p1 = `%${escapeForIlike(t1)}%`
    const [d1, d2, dName] = await Promise.all([
      base().ilike(AFN, p0).ilike(ALN, p1).limit(limit),
      base().ilike(AFN, p1).ilike(ALN, p0).limit(limit),
      base().ilike("name", p0).ilike("name", p1).limit(limit),
    ])
    if (!d1.error) pushRows(d1.data as Record<string, unknown>[])
    if (!d2.error) pushRows(d2.data as Record<string, unknown>[])
    if (!dName.error) pushRows(dName.data as Record<string, unknown>[])
  }

  const qLower = q.toLowerCase()

  if (byId.size < Math.min(8, limit)) {
    const anchor = tokens.length ? tokens.reduce((a, t) => (t.length > a.length ? t : a), "") : q
    const prefix = anchor.slice(0, Math.min(4, Math.max(2, anchor.length)))
    const loose = `%${escapeForIlike(prefix)}%`
    const [p1, p2, p3] = await Promise.all([
      base().ilike(ALN, loose).limit(FUZZY_POOL),
      base().ilike(AFN, loose).limit(FUZZY_POOL),
      base().ilike("name", loose).limit(FUZZY_POOL),
    ])
    if (!p1.error) pushRows(p1.data as Record<string, unknown>[])
    if (!p2.error) pushRows(p2.data as Record<string, unknown>[])
    if (!p3.error) pushRows(p3.data as Record<string, unknown>[])
  }

  const scored = [...byId.values()]
    .map((row) => {
      const r = row as Record<string, unknown>
      const f = rowFirst(r)
      const l = rowLast(r)
      const disp = athleteDisplayName(r)
      const score = scoreAthleteNameMatch(qLower, f, l, disp)
      return { row, score, disp }
    })
    .filter((x) => {
      if (x.score >= 0.38) return true
      const last = rowLast(x.row as Record<string, unknown>).toLowerCase()
      const nameField = String(x.row.name ?? "").trim()
      const lastFromFullName =
        nameField && nameField.includes(" ") ? (nameField.split(/\s+/).pop() ?? "").toLowerCase() : ""
      const lastCompare = last || lastFromFullName
      const parts = qLower.split(/\s+/)
      const wantLast = parts.length > 1 ? parts[parts.length - 1] : qLower
      if (lastCompare && wantLast.length >= 3) {
        return levenshteinDistance(wantLast, lastCompare) <= 2
      }
      return x.score >= 0.32
    })
    .sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const out: unknown[] = []
  for (const { row } of scored) {
    const id = String((row as { id?: string }).id ?? "")
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
    if (out.length >= limit) break
  }

  return {
    rows: out,
    searched_for: q,
  }
}

type SchoolRow = {
  school_name: string
  classification?: string | null
  region?: string | null
  effective_year?: number | null
  source: "school_classifications" | "athlete_roster"
}

export async function toolSearchSchoolClassifications(args: { query: string; limit?: number }) {
  const raw = sanitizeFragment(args.query || "")
  const limit = Math.min(Math.max(Number(args.limit) || 25, 1), MAX_ROWS)
  const phrase = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const q = phrase.trim()
  if (q.length < 2) {
    return {
      error: "School query must be at least 2 characters (e.g. 'Cardinal Gibbons').",
      rows: [] as unknown[],
    }
  }

  const admin = getSupabaseAdmin()
  const pattern = `%${escapeForIlike(q)}%`
  const qLower = q.toLowerCase()

  const [clsRes, athRes] = await Promise.all([
    admin
      .from("school_classifications")
      .select("school_name,classification,region,effective_year")
      .ilike("school_name", pattern)
      .limit(limit),
    admin
      .from("athletes")
      .select("highschool")
      .not("highschool", "is", null)
      .ilike("highschool", pattern)
      .limit(80),
  ])

  if (clsRes.error && athRes.error) {
    return { error: clsRes.error.message || athRes.error.message, rows: [] as unknown[] }
  }

  const merged = new Map<string, SchoolRow>()

  for (const r of clsRes.data ?? []) {
    const row = r as Record<string, unknown>
    const name = String(row.school_name ?? "").trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!merged.has(key)) {
      merged.set(key, {
        school_name: name,
        classification: row.classification != null ? String(row.classification) : null,
        region: row.region != null ? String(row.region) : null,
        effective_year: row.effective_year != null ? Number(row.effective_year) : null,
        source: "school_classifications",
      })
    }
  }

  for (const r of athRes.data ?? []) {
    const name = String((r as { highschool?: string }).highschool ?? "").trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!merged.has(key)) {
      merged.set(key, {
        school_name: name,
        source: "athlete_roster",
      })
    }
  }

  let list = [...merged.values()]

  if (list.length < 5) {
    const anchor = q.slice(0, Math.min(5, Math.max(2, q.length)))
    const loose = `%${escapeForIlike(anchor)}%`
    const wide = await admin
      .from("school_classifications")
      .select("school_name,classification,region,effective_year")
      .ilike("school_name", loose)
      .limit(400)

    if (!wide.error && wide.data?.length) {
      const scored = (wide.data as Record<string, unknown>[])
        .map((row) => {
          const name = String(row.school_name ?? "").trim()
          if (!name) return null
          const sc = scoreSchoolMatch(qLower, name)
          return { row, name, sc }
        })
        .filter((x): x is NonNullable<typeof x> => x != null && x.sc >= 0.35)
        .sort((a, b) => b.sc - a.sc)

      for (const { row, name, sc } of scored) {
        const key = name.toLowerCase()
        if (merged.has(key)) continue
        if (sc < 0.38 && levenshteinDistance(qLower, name.toLowerCase()) > 3) continue
        merged.set(key, {
          school_name: name,
          classification: row.classification != null ? String(row.classification) : null,
          region: row.region != null ? String(row.region) : null,
          effective_year: row.effective_year != null ? Number(row.effective_year) : null,
          source: "school_classifications",
        })
        if (merged.size >= limit + 15) break
      }
      list = [...merged.values()]
    }
  }

  const finalScored = list
    .map((row) => ({
      row,
      sc: scoreSchoolMatch(qLower, row.school_name),
    }))
    .sort((a, b) => b.sc - a.sc)
    .filter((x) => x.sc >= 0.34 || levenshteinDistance(qLower, x.row.school_name.toLowerCase()) <= 3)

  let out = finalScored.slice(0, limit).map((x) => x.row)
  if (out.length === 0 && merged.size > 0) {
    out = [...merged.values()].slice(0, limit)
  }

  return {
    rows: out as unknown[],
    searched_for: q,
  }
}

export async function toolNhscaPlacementsSearch(args: {
  query: string
  year?: number | null
  limit?: number
}) {
  const raw = sanitizeFragment(args.query || "")
  const q = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const limit = Math.min(Math.max(Number(args.limit) || 30, 1), MAX_ROWS)
  if (q.trim().length < 2) {
    return { error: "Query must be at least 2 characters.", rows: [] as unknown[] }
  }
  const pattern = `%${escapeForIlike(q.trim())}%`
  const admin = getSupabaseAdmin()
  const sel = "athlete_name,placement,year,division,weight_class,high_school"
  const y = args.year != null && Number.isFinite(args.year) ? Math.floor(Number(args.year)) : null
  const q1 = admin.from("nhsca_placements").select(sel).ilike("athlete_name", pattern).limit(limit)
  const q2 = admin.from("nhsca_placements").select(sel).ilike("high_school", pattern).limit(limit)
  const [r1, r2] = await Promise.all([
    y != null ? q1.eq("year", y) : q1,
    y != null ? q2.eq("year", y) : q2,
  ])
  const err = r1.error || r2.error
  if (err) {
    return { error: err.message, rows: [] as unknown[] }
  }
  const key = (row: Record<string, unknown>) =>
    `${row.athlete_name}|${row.year}|${row.placement}|${row.high_school}|${row.weight_class}`
  const seen = new Set<string>()
  const merged: unknown[] = []
  for (const row of [...(r1.data ?? []), ...(r2.data ?? [])]) {
    const r = row as Record<string, unknown>
    const k = key(r)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(row)
    if (merged.length >= limit) break
  }
  return { rows: merged }
}

export async function toolNchsaaStateResultsSearch(args: { query: string; limit?: number }) {
  const raw = sanitizeFragment(args.query || "")
  const q = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const limit = Math.min(Math.max(Number(args.limit) || 30, 1), MAX_ROWS)
  if (q.trim().length < 2) {
    return { error: "Query must be at least 2 characters.", rows: [] as unknown[] }
  }
  const pattern = `%${escapeForIlike(q.trim())}%`
  const admin = getSupabaseAdmin()
  const sel = "wrestler_name,place,year,classification,weight_class,school"
  const [r1, r2] = await Promise.all([
    admin.from("wrestling_nchsaa_results").select(sel).ilike("wrestler_name", pattern).limit(limit),
    admin.from("wrestling_nchsaa_results").select(sel).ilike("school", pattern).limit(limit),
  ])
  const err = r1.error || r2.error
  if (err) {
    return { error: err.message, rows: [] as unknown[] }
  }
  const seen = new Set<string>()
  const merged: unknown[] = []
  for (const row of [...(r1.data ?? []), ...(r2.data ?? [])]) {
    const r = row as Record<string, unknown>
    const k = `${r.wrestler_name}|${r.year}|${r.place}|${r.school}|${r.weight_class}`
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(row)
    if (merged.length >= limit) break
  }
  return { rows: merged }
}

export async function toolCollegeCommitsSearch(args: {
  query?: string
  grad_year?: number | null
  limit?: number
}) {
  const limit = Math.min(Math.max(Number(args.limit) || 25, 1), MAX_ROWS)
  const admin = getSupabaseAdmin()
  const sel = `${AFN},${ALN},highschool,${AGY},college,division`
  const rawFrag = args.query ? sanitizeFragment(args.query) : ""
  const frag = rawFrag ? extractSearchablePhrase(rawFrag) || stripConversationalNoise(rawFrag) : ""
  const gy =
    args.grad_year != null && Number.isFinite(args.grad_year)
      ? Math.floor(Number(args.grad_year))
      : null

  if (frag.trim().length >= 2) {
    const pattern = `%${escapeForIlike(frag.trim())}%`
    const base = () => admin.from("athletes").select(sel).not("college", "is", null)
    const [a, b, c, d] = await Promise.all([
      gy != null ? base().eq(AGY, gy).ilike(AFN, pattern).limit(limit) : base().ilike(AFN, pattern).limit(limit),
      gy != null ? base().eq(AGY, gy).ilike(ALN, pattern).limit(limit) : base().ilike(ALN, pattern).limit(limit),
      gy != null ? base().eq(AGY, gy).ilike("college", pattern).limit(limit) : base().ilike("college", pattern).limit(limit),
      gy != null ? base().eq(AGY, gy).ilike("highschool", pattern).limit(limit) : base().ilike("highschool", pattern).limit(limit),
    ])
    const err = a.error || b.error || c.error || d.error
    if (err) {
      return { error: err.message, rows: [] as unknown[] }
    }
    const byKey = new Map<string, Record<string, unknown>>()
    for (const row of [...(a.data ?? []), ...(b.data ?? []), ...(c.data ?? []), ...(d.data ?? [])]) {
      const r = row as Record<string, unknown>
      const k = `${r[AFN] ?? r.first_name}|${r[ALN] ?? r.last_name}|${r[AGY] ?? r.grad_year}|${r.college}`
      if (!byKey.has(k)) byKey.set(k, r)
    }
    return { rows: [...byKey.values()].slice(0, limit) }
  }

  let q = admin.from("athletes").select(sel).not("college", "is", null).limit(limit)
  if (gy != null) {
    q = q.eq(AGY, gy)
  }
  const { data, error } = await q
  if (error) {
    return { error: error.message, rows: [] as unknown[] }
  }
  return { rows: data ?? [] }
}

export async function toolGetAthleteFullDossier(args: { athlete_id: string }) {
  const id = String(args.athlete_id ?? "").trim()
  const result = await buildAthleteDossierMarkdown(id)
  if (result.error) {
    return { error: result.error, markdown: "" }
  }
  return { markdown: result.markdown }
}

export type DataToolName =
  | "search_athletes"
  | "search_school_classifications"
  | "nhsca_placements_search"
  | "nchsaa_state_results_search"
  | "college_commits_search"
  | "get_athlete_full_dossier"

export async function executeDataTool(name: string, rawArgs: unknown): Promise<string> {
  let args: Record<string, unknown> = {}
  try {
    args =
      typeof rawArgs === "string"
        ? (JSON.parse(rawArgs || "{}") as Record<string, unknown>)
        : ((rawArgs as Record<string, unknown>) || {})
  } catch {
    return JSON.stringify({ error: "Invalid JSON arguments" })
  }

  try {
    switch (name as DataToolName) {
      case "search_athletes":
        return JSON.stringify(await toolSearchAthletes(args as { query: string; limit?: number }))
      case "search_school_classifications":
        return JSON.stringify(
          await toolSearchSchoolClassifications(args as { query: string; limit?: number }),
        )
      case "nhsca_placements_search":
        return JSON.stringify(
          await toolNhscaPlacementsSearch(
            args as { query: string; year?: number | null; limit?: number },
          ),
        )
      case "nchsaa_state_results_search":
        return JSON.stringify(
          await toolNchsaaStateResultsSearch(args as { query: string; limit?: number }),
        )
      case "college_commits_search":
        return JSON.stringify(
          await toolCollegeCommitsSearch(
            args as { query?: string; grad_year?: number | null; limit?: number },
          ),
        )
      case "get_athlete_full_dossier":
        return JSON.stringify(await toolGetAthleteFullDossier(args as { athlete_id: string }))
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return JSON.stringify({ error: msg })
  }
}
