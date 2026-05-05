/**
 * Read-only Supabase tools for Data Dawg Agent v2.
 * Athlete + school search: conversational stripping, multi-strategy SQL, Levenshtein re-rank for typos.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { getAthletesColumnNames } from "@/lib/athletes-schema"
import type { SupabaseClient } from "@supabase/supabase-js"
import { escapeForIlike } from "@/lib/nchsaa-results"
import {
  extractSearchablePhrase,
  stripConversationalNoise,
  tokenizeMeaningfulWords,
} from "./search-normalize"
import {
  combinedAthleteSearchScore,
  levenshteinDistance,
  scoreAthleteNameMatch,
  scoreSchoolMatch,
} from "./fuzzy-utils"
import { buildAthleteDossierMarkdown } from "@/lib/data-dawg-athlete-dossier"
import { getNchsaaStateChampionsByExactTitleCount } from "@/lib/nchsaa-multi-time-state-champions"

const MAX_ROWS = 40
const MAX_Q_LEN = 120
const FUZZY_POOL = 260

type AthleteSearchCols = { fn: string; ln: string; gy: string; hs: string }

let cachedAthleteSearchCols: AthleteSearchCols | null = null

function pickExisting(names: Set<string>, candidates: string[], fallback: string): string {
  for (const c of candidates) {
    if (names.has(c)) return c
  }
  return fallback
}

/**
 * Resolve real PostgREST column names once per process. Always use `select('*')` for reads — a bad
 * explicit column list (e.g. missing `division`) makes every query fail with zero rows.
 */
async function getAthleteSearchCols(admin: SupabaseClient): Promise<AthleteSearchCols> {
  if (cachedAthleteSearchCols) return cachedAthleteSearchCols
  const names = await getAthletesColumnNames(admin)
  const fn = pickExisting(names, ["firstName", "firstname", "first_name"], "firstName")
  const ln = pickExisting(names, ["lastName", "lastname", "last_name"], "lastName")
  const gy = pickExisting(names, ["graduationyear", "graduation_year", "graduationYear"], "graduationyear")
  const hs = pickExisting(names, ["highschool", "high_school", "highSchool"], "highschool")
  cachedAthleteSearchCols = { fn, ln, gy, hs }
  return cachedAthleteSearchCols
}

function athletesBase(admin: SupabaseClient) {
  return admin.from("athletes").select("*")
}

function sanitizeFragment(q: string): string {
  return q.replace(/%/g, "").replace(/,/g, " ").trim().slice(0, MAX_Q_LEN)
}

function athleteDisplayName(row: Record<string, unknown>, cols: AthleteSearchCols): string {
  const full = String(row.name ?? "").trim()
  if (full) return full
  const f = String(row[cols.fn] ?? row.first_name ?? row.firstname ?? "").trim()
  const l = String(row[cols.ln] ?? row.last_name ?? row.lastname ?? "").trim()
  return `${f} ${l}`.trim()
}

function rowFirst(row: Record<string, unknown>, cols: AthleteSearchCols): string {
  return String(row[cols.fn] ?? row.first_name ?? row.firstname ?? "").trim()
}

function rowLast(row: Record<string, unknown>, cols: AthleteSearchCols): string {
  return String(row[cols.ln] ?? row.last_name ?? row.lastname ?? "").trim()
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
  const cols = await getAthleteSearchCols(admin)
  const pattern = `%${escapeForIlike(q)}%`

  const byId = new Map<string, Record<string, unknown>>()
  const queryErrors: string[] = []

  const pushRows = (rows: Record<string, unknown>[] | null | undefined) => {
    for (const row of rows ?? []) {
      const id = String((row as { id?: string }).id ?? "")
      if (id && !byId.has(id)) byId.set(id, row)
    }
  }

  const merge = (res: { data: unknown; error: { message: string } | null }, label?: string) => {
    if (res.error) {
      const msg = res.error.message || "unknown error"
      queryErrors.push(label ? `${label}: ${msg}` : msg)
      return
    }
    pushRows(res.data as Record<string, unknown>[])
  }

  /** Single OR filter hits name + first + last + school in one round trip (PostgREST). */
  const orClause = [
    `name.ilike.${pattern}`,
    `${cols.fn}.ilike.${pattern}`,
    `${cols.ln}.ilike.${pattern}`,
    `${cols.hs}.ilike.${pattern}`,
  ].join(",")
  const broad = await athletesBase(admin).or(orClause).limit(limit)
  merge(broad, "or(name,first,last,school)")
  if (byId.size === 0 && broad.error) {
    const narrowOr = [`name.ilike.${pattern}`, `${cols.fn}.ilike.${pattern}`, `${cols.ln}.ilike.${pattern}`].join(",")
    const retry = await athletesBase(admin).or(narrowOr).limit(limit)
    merge(retry, "or(name,first,last)")
  }

  const [a, b, c, nFull] = await Promise.all([
    athletesBase(admin).ilike(cols.fn, pattern).limit(limit),
    athletesBase(admin).ilike(cols.ln, pattern).limit(limit),
    athletesBase(admin).ilike(cols.hs, pattern).limit(limit),
    athletesBase(admin).ilike("name", pattern).limit(limit),
  ])
  merge(a, "ilike_first")
  merge(b, "ilike_last")
  merge(c, "ilike_school")
  merge(nFull, "ilike_name")

  const tokens = tokenizeMeaningfulWords(raw)
  if (tokens.length >= 2) {
    const t0 = tokens[0]
    const t1 = tokens[tokens.length - 1]
    const p0 = `%${escapeForIlike(t0)}%`
    const p1 = `%${escapeForIlike(t1)}%`
    const [d1, d2, dName] = await Promise.all([
      athletesBase(admin).ilike(cols.fn, p0).ilike(cols.ln, p1).limit(limit),
      athletesBase(admin).ilike(cols.fn, p1).ilike(cols.ln, p0).limit(limit),
      athletesBase(admin).ilike("name", p0).ilike("name", p1).limit(limit),
    ])
    merge(d1, "first+last_tokens")
    merge(d2, "first+last_swap")
    merge(dName, "name_tokens")
  }

  const qLower = q.toLowerCase()

  if (byId.size < Math.min(8, limit)) {
    const anchor = tokens.length ? tokens.reduce((a, t) => (t.length > a.length ? t : a), "") : q
    const prefix = anchor.slice(0, Math.min(4, Math.max(2, anchor.length)))
    const loose = `%${escapeForIlike(prefix)}%`
    const [p1, p2, p3] = await Promise.all([
      athletesBase(admin).ilike(cols.ln, loose).limit(FUZZY_POOL),
      athletesBase(admin).ilike(cols.fn, loose).limit(FUZZY_POOL),
      athletesBase(admin).ilike("name", loose).limit(FUZZY_POOL),
    ])
    merge(p1, "fuzzy_last")
    merge(p2, "fuzzy_first")
    merge(p3, "fuzzy_name")
  }

  if (byId.size === 0 && queryErrors.length > 0) {
    console.error("[RecruitNC Data Dawg] search_athletes DB errors (0 rows):", queryErrors[0], { searched_for: q })
  }

  const nameTokens = tokenizeMeaningfulWords(raw)

  const scored = [...byId.values()]
    .map((row) => {
      const r = row as Record<string, unknown>
      const f = rowFirst(r, cols)
      const l = rowLast(r, cols)
      const disp = athleteDisplayName(r, cols)
      const hs = String(r[cols.hs] ?? "").trim()
      const score = combinedAthleteSearchScore(qLower, nameTokens, f, l, disp, hs)
      return { row, score, disp }
    })
    .filter((x) => {
      if (x.score >= 0.28) return true
      const last = rowLast(x.row as Record<string, unknown>, cols).toLowerCase()
      const nameField = String(x.row.name ?? "").trim()
      const lastFromFullName =
        nameField && nameField.includes(" ") ? (nameField.split(/\s+/).pop() ?? "").toLowerCase() : ""
      const lastCompare = last || lastFromFullName
      const parts = qLower.split(/\s+/)
      // For "First Last School …" queries, surname is the second token, not the last ("Gibbons").
      const wantLast =
        parts.length >= 3 ? parts[1] : parts.length > 1 ? parts[parts.length - 1] : qLower
      if (lastCompare && wantLast.length >= 3) {
        return levenshteinDistance(wantLast, lastCompare) <= 2
      }
      return x.score >= 0.22
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

  if (out.length === 0 && byId.size > 0) {
    for (const row of byId.values()) {
      out.push(row)
      if (out.length >= limit) break
    }
  }

  if (out.length === 0 && queryErrors.length > 0) {
    return {
      error:
        "Athlete directory lookup failed (database). Try again in a minute or search on RecruitNC. If this persists, contact support.",
      rows: out,
      searched_for: q,
    }
  }

  const byDisplay = new Map<string, Record<string, unknown>[]>()
  for (const row of out) {
    const r = row as Record<string, unknown>
    const key = athleteDisplayName(r, cols).toLowerCase().replace(/\s+/g, " ").trim()
    if (!key) continue
    if (!byDisplay.has(key)) byDisplay.set(key, [])
    byDisplay.get(key)!.push(r)
  }
  const disambiguation = [...byDisplay.entries()]
    .filter(([, rows]) => rows.length >= 2)
    .map(([athlete_name, rows]) => ({
      athlete_name,
      candidates: rows.map((r) => ({
        id: String((r as { id?: string }).id ?? ""),
        highschool: String(r[cols.hs] ?? "").trim() || null,
        graduationyear:
          r[cols.gy] != null && String(r[cols.gy]).trim() !== ""
            ? Number(r[cols.gy])
            : null,
      })),
    }))

  return {
    rows: out,
    searched_for: q,
    ...(disambiguation.length
      ? {
          disambiguation,
          disambiguation_note:
            "Multiple directory rows share this display name. Prefer the candidate whose high school matches the user's message (or ask which school). Then call get_athlete_full_dossier for that id.",
        }
      : {}),
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
  const cols = await getAthleteSearchCols(admin)
  const rawFrag = args.query ? sanitizeFragment(args.query) : ""
  const frag = rawFrag ? extractSearchablePhrase(rawFrag) || stripConversationalNoise(rawFrag) : ""
  const gy =
    args.grad_year != null && Number.isFinite(args.grad_year)
      ? Math.floor(Number(args.grad_year))
      : null

  if (frag.trim().length >= 2) {
    const pattern = `%${escapeForIlike(frag.trim())}%`
    const base = () => admin.from("athletes").select("*").not("college", "is", null)
    const [a, b, c, d] = await Promise.all([
      gy != null ? base().eq(cols.gy, gy).ilike(cols.fn, pattern).limit(limit) : base().ilike(cols.fn, pattern).limit(limit),
      gy != null ? base().eq(cols.gy, gy).ilike(cols.ln, pattern).limit(limit) : base().ilike(cols.ln, pattern).limit(limit),
      gy != null ? base().eq(cols.gy, gy).ilike("college", pattern).limit(limit) : base().ilike("college", pattern).limit(limit),
      gy != null ? base().eq(cols.gy, gy).ilike(cols.hs, pattern).limit(limit) : base().ilike(cols.hs, pattern).limit(limit),
    ])
    const rows: Record<string, unknown>[] = []
    for (const res of [a, b, c, d]) {
      if (!res.error && res.data?.length) rows.push(...(res.data as Record<string, unknown>[]))
    }
    if (rows.length === 0 && (a.error || b.error || c.error || d.error)) {
      const msg = a.error?.message || b.error?.message || c.error?.message || d.error?.message
      return { error: msg || "Query failed", rows: [] as unknown[] }
    }
    const byKey = new Map<string, Record<string, unknown>>()
    for (const row of rows) {
      const r = row as Record<string, unknown>
      const k = `${r[cols.fn] ?? r.first_name}|${r[cols.ln] ?? r.last_name}|${r[cols.gy] ?? r.graduation_year}|${r.college}`
      if (!byKey.has(k)) byKey.set(k, r)
    }
    return { rows: [...byKey.values()].slice(0, limit) }
  }

  let q = admin.from("athletes").select("*").not("college", "is", null).limit(limit)
  if (gy != null) {
    q = q.eq(cols.gy, gy)
  }
  const { data, error } = await q
  if (error) {
    return { error: error.message, rows: [] as unknown[] }
  }
  return { rows: data ?? [] }
}

export async function toolNchsaaMultiTimeStateChampions(args: { times: number }) {
  const t = Math.floor(Number(args.times))
  if (t !== 2 && t !== 3 && t !== 4) {
    return {
      error: "times must be 2, 3, or 4 (individual NCHSAA state championships, place=1).",
      champions: [] as unknown[],
    }
  }
  const champions = await getNchsaaStateChampionsByExactTitleCount(t as 2 | 3 | 4)
  return {
    exact_title_count: t,
    total_wrestlers: champions.length,
    champions,
    note:
      t === 4
        ? "Four-time individual state champions: curated list of 14 (official NC high school wrestling record book)."
        : null,
  }
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
  | "nchsaa_multi_time_state_champions"
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
      case "nchsaa_multi_time_state_champions":
        return JSON.stringify(
          await toolNchsaaMultiTimeStateChampions(args as { times: number }),
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
