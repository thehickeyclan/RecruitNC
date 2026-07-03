/**
 * Read-only Supabase tools for Data Dawg Agent v2.
 * Athlete + school search: conversational stripping, multi-strategy SQL, Levenshtein re-rank for typos.
 */

import { getSupabaseAdmin } from "@/lib/server-supabase"
import { getAthletesColumnNames } from "@/lib/athletes-schema"
import type { SupabaseClient } from "@supabase/supabase-js"
import { escapeForIlike } from "@/lib/nchsaa-results"
import {
  filterRowsByAthleteMatchContext,
  type AthleteMatchContext,
} from "@/lib/athlete-name-match"
import { dualTokenPairsForNchsaa } from "@/lib/nchsaa-profile-fetch"
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
import { buildSchoolWrestlingDossierMarkdown } from "@/lib/data-dawg-school-dossier"
import { getNchsaaStateChampionsByExactTitleCount } from "@/lib/nchsaa-multi-time-state-champions"
import { loadNcUnitedResultsForNameSearch } from "@/lib/national-team-live-profile-results"

const MAX_ROWS = 40
const MAX_Q_LEN = 120
const FUZZY_POOL = 260
/**
 * Per-strategy row cap. Unordered ILIKE + limit biases toward whatever physical/index order Postgres returns
 * (often "recent" rows), so alumni never enter the merge pool — we spread by grad year (see below).
 */
const STRATEGY_CAP = 420

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

/** Prefer split columns; fall back to first / last token of `name` when columns are blank. */
function directoryFirstLastLow(
  row: Record<string, unknown>,
  cols: AthleteSearchCols,
): { firstLow: string; lastLow: string } {
  let f = rowFirst(row, cols).toLowerCase()
  let l = rowLast(row, cols).toLowerCase()
  const nameField = String(row.name ?? "").trim()
  if (nameField.includes(" ")) {
    const bits = nameField.split(/\s+/).filter(Boolean)
    if (!f && bits.length) f = bits[0].toLowerCase()
    if (!l && bits.length >= 2) l = bits[bits.length - 1].toLowerCase()
  }
  return { firstLow: f, lastLow: l }
}

function maxTypoDistForToken(tok: string): number {
  return tok.length <= 4 ? 1 : 2
}

/** Half the pool ordered by grad year ascending, half descending — mitigates bias to recent rows only. */
async function mergeIlikeWithGradYearSpread(
  admin: SupabaseClient,
  cols: AthleteSearchCols,
  column: string,
  pat: string,
  cap: number,
  labelAsc: string,
  labelDesc: string,
  merge: (res: { data: unknown; error: { message: string } | null }, label?: string) => void,
) {
  const half = Math.max(1, Math.floor(cap / 2))
  const [asc, desc] = await Promise.all([
    athletesBase(admin).ilike(column, pat).order(cols.gy, { ascending: true, nullsFirst: false }).limit(half),
    athletesBase(admin).ilike(column, pat).order(cols.gy, { ascending: false, nullsFirst: false }).limit(half),
  ])
  merge(asc, labelAsc)
  merge(desc, labelDesc)
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
  const tokens = tokenizeMeaningfulWords(raw)
  const strategyCap = Math.min(600, Math.max(limit, STRATEGY_CAP))
  const firstTokPat =
    tokens.length > 0 ? `%${escapeForIlike(tokens[0])}%` : pattern
  const lastTokPat =
    tokens.length >= 2
      ? `%${escapeForIlike(tokens[tokens.length - 1])}%`
      : tokens.length === 1
        ? firstTokPat
        : pattern

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
  const halfCap = Math.max(1, Math.floor(strategyCap / 2))
  const [broadAsc, broadDesc] = await Promise.all([
    athletesBase(admin).or(orClause).order(cols.gy, { ascending: true, nullsFirst: false }).limit(halfCap),
    athletesBase(admin).or(orClause).order(cols.gy, { ascending: false, nullsFirst: false }).limit(halfCap),
  ])
  merge(broadAsc, "or(name,first,last,school)_gy_asc")
  merge(broadDesc, "or(name,first,last,school)_gy_desc")
  if (byId.size === 0 && broadAsc.error && broadDesc.error) {
    const narrowOr = [`name.ilike.${pattern}`, `${cols.fn}.ilike.${pattern}`, `${cols.ln}.ilike.${pattern}`].join(",")
    const [nAsc, nDesc] = await Promise.all([
      athletesBase(admin).or(narrowOr).order(cols.gy, { ascending: true, nullsFirst: false }).limit(halfCap),
      athletesBase(admin).or(narrowOr).order(cols.gy, { ascending: false, nullsFirst: false }).limit(halfCap),
    ])
    merge(nAsc, "or(name,first,last)_gy_asc")
    merge(nDesc, "or(name,first,last)_gy_desc")
  }

  // Isolated first/last columns need token-sized ILIKEs — `%First Last%` never matches split name fields.
  await mergeIlikeWithGradYearSpread(admin, cols, cols.fn, firstTokPat, strategyCap, "ilike_first_gy_asc", "ilike_first_gy_desc", merge)
  await mergeIlikeWithGradYearSpread(admin, cols, cols.ln, lastTokPat, strategyCap, "ilike_last_gy_asc", "ilike_last_gy_desc", merge)

  const [c, nAsc, nDesc] = await Promise.all([
    athletesBase(admin).ilike(cols.hs, pattern).limit(strategyCap),
    athletesBase(admin).ilike("name", pattern).order(cols.gy, { ascending: true, nullsFirst: false }).limit(halfCap),
    athletesBase(admin).ilike("name", pattern).order(cols.gy, { ascending: false, nullsFirst: false }).limit(halfCap),
  ])
  merge(c, "ilike_school")
  merge(nAsc, "ilike_name_gy_asc")
  merge(nDesc, "ilike_name_gy_desc")

  if (tokens.length >= 2) {
    const t0 = tokens[0]
    const t1 = tokens[tokens.length - 1]
    const p0 = `%${escapeForIlike(t0)}%`
    const p1 = `%${escapeForIlike(t1)}%`
    const pairHalf = Math.max(1, Math.floor(strategyCap / 2))
    const [d1a, d1b, d2a, d2b, dNa, dNb] = await Promise.all([
      athletesBase(admin).ilike(cols.fn, p0).ilike(cols.ln, p1).order(cols.gy, { ascending: true, nullsFirst: false }).limit(pairHalf),
      athletesBase(admin).ilike(cols.fn, p0).ilike(cols.ln, p1).order(cols.gy, { ascending: false, nullsFirst: false }).limit(pairHalf),
      athletesBase(admin).ilike(cols.fn, p1).ilike(cols.ln, p0).order(cols.gy, { ascending: true, nullsFirst: false }).limit(pairHalf),
      athletesBase(admin).ilike(cols.fn, p1).ilike(cols.ln, p0).order(cols.gy, { ascending: false, nullsFirst: false }).limit(pairHalf),
      athletesBase(admin).ilike("name", p0).ilike("name", p1).order(cols.gy, { ascending: true, nullsFirst: false }).limit(pairHalf),
      athletesBase(admin).ilike("name", p0).ilike("name", p1).order(cols.gy, { ascending: false, nullsFirst: false }).limit(pairHalf),
    ])
    merge(d1a, "first+last_tokens_gy_asc")
    merge(d1b, "first+last_tokens_gy_desc")
    merge(d2a, "first+last_swap_gy_asc")
    merge(d2b, "first+last_swap_gy_desc")
    merge(dNa, "name_tokens_gy_asc")
    merge(dNb, "name_tokens_gy_desc")
  }

  const qLower = q.toLowerCase()

  if (byId.size === 0) {
    const anchor = tokens.length ? tokens.reduce((a, t) => (t.length > a.length ? t : a), "") : q
    const prefix = anchor.slice(0, Math.min(4, Math.max(2, anchor.length)))
    const loose = `%${escapeForIlike(prefix)}%`
    await mergeIlikeWithGradYearSpread(admin, cols, cols.ln, loose, FUZZY_POOL, "fuzzy_last_gy_asc", "fuzzy_last_gy_desc", merge)
    await mergeIlikeWithGradYearSpread(admin, cols, cols.fn, loose, FUZZY_POOL, "fuzzy_first_gy_asc", "fuzzy_first_gy_desc", merge)
    await mergeIlikeWithGradYearSpread(admin, cols, "name", loose, FUZZY_POOL, "fuzzy_name_gy_asc", "fuzzy_name_gy_desc", merge)
  }

  if (byId.size === 0 && queryErrors.length > 0) {
    console.error("[RecruitNC Data Dawg] search_athletes DB errors (0 rows):", queryErrors[0], { searched_for: q })
  }

  const scored = [...byId.values()]
    .map((row) => {
      const r = row as Record<string, unknown>
      const f = rowFirst(r, cols)
      const l = rowLast(r, cols)
      const disp = athleteDisplayName(r, cols)
      const hs = String(r[cols.hs] ?? "").trim()
      const score = combinedAthleteSearchScore(qLower, tokens, f, l, disp, hs)
      return { row, score, disp }
    })
    .filter((x) => {
      const parts = qLower.split(/\s+/).filter(Boolean)
      // For "First Last School …" queries, surname is the second token, not the last ("Gibbons").
      const wantLast =
        parts.length >= 3 ? parts[1] : parts.length > 1 ? parts[parts.length - 1] : qLower
      const wantFirst = parts[0] ?? ""
      const { firstLow, lastLow } = directoryFirstLastLow(x.row as Record<string, unknown>, cols)
      const lastCompare = lastLow

      // Exactly two meaningful tokens → treat as First + Last (not "First + School"). Wrong surnames
      // must not pass on composite score / first-name overlap alone (Tyler Tracy vs Tyler Gardner).
      if (
        tokens.length === 2 &&
        tokens[0].length >= 2 &&
        tokens[1].length >= 2 &&
        wantFirst.length >= 2 &&
        wantLast.length >= 2
      ) {
        if (!firstLow || !lastCompare) return false
        if (levenshteinDistance(tokens[0], firstLow) > maxTypoDistForToken(tokens[0])) return false
        if (levenshteinDistance(tokens[1], lastCompare) > maxTypoDistForToken(tokens[1])) return false
        return true
      }

      if (x.score >= 0.28) {
        // "First Last School …" — school overlap can inflate score; do not admit rows whose first two
        // tokens disagree with directory first/last (e.g. Tyler Gardner + Jacksonville vs Tyler Tracy).
        const needsNameStem =
          tokens.length >= 3 &&
          tokens[0].length >= 2 &&
          tokens[1].length >= 2 &&
          Boolean(firstLow && lastCompare)
        if (
          !needsNameStem ||
          (levenshteinDistance(tokens[0], firstLow) <= maxTypoDistForToken(tokens[0]) &&
            levenshteinDistance(tokens[1], lastCompare) <= maxTypoDistForToken(tokens[1]))
        ) {
          return true
        }
      }

      if (tokens.length >= 2 && lastCompare && wantLast.length >= 2) {
        const maxLastDist = wantLast.length <= 4 ? 1 : 2
        if (levenshteinDistance(wantLast, lastCompare) <= maxLastDist) {
          if (!firstLow || wantFirst.length < 2 || levenshteinDistance(wantFirst, firstLow) <= 2) {
            return true
          }
        }
      }

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
  const plcSel = "athlete_name,placement,year,division,weight_class,high_school"
  const legSel = "athlete_name,placement,year,division,weight,high_school"
  const y = args.year != null && Number.isFinite(args.year) ? Math.floor(Number(args.year)) : null

  // Historical NHSCA lives in both tables — never query placements alone.
  const plcName = admin.from("nhsca_placements").select(plcSel).ilike("athlete_name", pattern).order("year", { ascending: false }).limit(limit)
  const plcSchool = admin.from("nhsca_placements").select(plcSel).ilike("high_school", pattern).order("year", { ascending: false }).limit(limit)
  const legName = admin.from("wrestling_nhsca_results").select(legSel).ilike("athlete_name", pattern).order("year", { ascending: false }).limit(limit)
  const legSchool = admin.from("wrestling_nhsca_results").select(legSel).ilike("high_school", pattern).order("year", { ascending: false }).limit(limit)

  const [r1, r2, r3, r4] = await Promise.all([
    y != null ? plcName.eq("year", y) : plcName,
    y != null ? plcSchool.eq("year", y) : plcSchool,
    y != null ? legName.eq("year", y) : legName,
    y != null ? legSchool.eq("year", y) : legSchool,
  ])

  const hardErr = [r1, r2, r3, r4].find((r) => r.error && !String(r.error.message).includes("does not exist"))
  if (hardErr?.error && !(r1.data?.length || r2.data?.length || r3.data?.length || r4.data?.length)) {
    return { error: hardErr.error.message, rows: [] as unknown[] }
  }

  const normalize = (row: Record<string, unknown>, source: "nhsca_placements" | "wrestling_nhsca_results") => ({
    athlete_name: row.athlete_name,
    placement: row.placement,
    year: row.year,
    division: row.division,
    weight_class: row.weight_class ?? row.weight ?? null,
    high_school: row.high_school,
    source,
  })

  const key = (row: Record<string, unknown>) =>
    `${row.athlete_name}|${row.year}|${row.placement}|${row.high_school}|${row.weight_class ?? row.weight ?? ""}`
  const seen = new Set<string>()
  const merged: unknown[] = []
  // Prefer placements table when both have the same year/athlete (newer import).
  for (const row of [...(r1.data ?? []), ...(r2.data ?? [])]) {
    const r = row as Record<string, unknown>
    const k = key(r)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(normalize(r, "nhsca_placements"))
    if (merged.length >= limit) break
  }
  if (merged.length < limit) {
    for (const row of [...(r3.data ?? []), ...(r4.data ?? [])]) {
      const r = row as Record<string, unknown>
      const k = key(r)
      if (seen.has(k)) continue
      seen.add(k)
      merged.push(normalize(r, "wrestling_nhsca_results"))
      if (merged.length >= limit) break
    }
  }
  return {
    rows: merged,
    note: "Merged nhsca_placements + wrestling_nhsca_results (all years unless year filter set).",
  }
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
  // No year filter — full historical NCHSAA table. Order newest-first for display; raise limit for school queries.
  const fetchCap = Math.min(Math.max(limit * 3, limit), 120)
  const [r1, r2] = await Promise.all([
    admin
      .from("wrestling_nchsaa_results")
      .select(sel)
      .ilike("wrestler_name", pattern)
      .order("year", { ascending: false })
      .limit(fetchCap),
    admin
      .from("wrestling_nchsaa_results")
      .select(sel)
      .ilike("school", pattern)
      .order("year", { ascending: false })
      .limit(fetchCap),
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
  return {
    rows: merged,
    note: "All years in wrestling_nchsaa_results (no year cutoff). For a full career report use get_athlete_full_dossier.",
  }
}

const CROSS_STORE_CAP = 50

function dedupeByKey<T>(rows: T[], keyFn: (r: T) => string): T[] {
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

function crossStoreRowName(r: Record<string, unknown>): string {
  const direct = String(r.wrestler_name ?? r.athlete_name ?? "").trim()
  if (direct) return direct
  const first = String(r.first_name ?? "").trim()
  const last = String(r.last_name ?? "").trim()
  return `${first} ${last}`.trim()
}

function crossStoreRowSchool(r: Record<string, unknown>): string {
  return String(r.school ?? r.high_school ?? r.highSchool ?? "").trim()
}

function filterCrossStoreByDirectoryContext(
  rows: Record<string, unknown>[],
  opts: { directoryHighSchool?: string; gradYear?: number | null; displayName?: string },
): Record<string, unknown>[] {
  let out = rows
  const hsFrag = opts.directoryHighSchool?.trim()
  if (hsFrag && hsFrag.length >= 3) {
    const h = hsFrag.toLowerCase()
    out = out.filter((r) => {
      const parts = [r.school, r.high_school, r.highSchool]
        .map((x) => String(x ?? "").trim().toLowerCase())
        .filter(Boolean)
      if (parts.length === 0) return true
      return parts.some((p) => p.includes(h) || h.includes(p))
    })
  }
  const gy = opts.gradYear
  if (gy != null && Number.isFinite(gy)) {
    const g = Math.floor(Number(gy))
    const lo = g - 6
    const hi = g + 1
    out = out.filter((r) => {
      const yRaw = r.year
      if (yRaw == null || String(yRaw).trim() === "") return true
      const y = Number(yRaw)
      if (!Number.isFinite(y)) return true
      return y >= lo && y <= hi
    })
  }

  const displayName = opts.displayName?.trim()
  if (displayName && displayName.length >= 2) {
    const context: AthleteMatchContext = {
      displayName,
      graduationYear: gy ?? null,
      highSchool: hsFrag ?? null,
    }
    out = filterRowsByAthleteMatchContext(out, context, (r) => ({
      name: crossStoreRowName(r),
      school: crossStoreRowSchool(r),
      year: r.year != null && String(r.year).trim() !== "" ? Number(r.year) : null,
    }))
  }

  return out
}

/**
 * Single tool: NCHSAA state + NHSCA (placements + legacy) + Super32 + NC United roster — all years in DB.
 * Complements `search_athletes` (directory row + dossier need an athlete id).
 */
export async function toolWrestlingCrossStoreSearch(args: {
  query: string
  limit?: number
  /** After you pick a directory athlete, pass their `highschool` so tournament rows from other namesakes are dropped when school is present on the row. */
  directory_high_school?: string
  /** Grad year from directory row; keeps rows whose `year` is roughly in high-school range (grad−6 … grad+1). */
  grad_year?: number | string | null
}) {
  const raw = sanitizeFragment(String(args.query ?? ""))
  const phrase = extractSearchablePhrase(raw) || stripConversationalNoise(raw)
  const q = phrase.trim()
  const perTable = Math.min(CROSS_STORE_CAP, Math.max(8, Number(args.limit) || 32))
  if (q.length < 2) {
    return {
      error: "Query must be at least 2 characters.",
      nchsaa_state: [] as unknown[],
      nhsca_placements: [] as unknown[],
      nhsca_legacy_table: [] as unknown[],
      super32: [] as unknown[],
      nc_united_roster: [] as unknown[],
    }
  }
  const pattern = `%${escapeForIlike(q)}%`
  const admin = getSupabaseAdmin()

  const nchsaaSel = "wrestler_name,place,year,classification,weight_class,school"

  const nhscaSelPlc = "athlete_name,placement,year,division,weight_class,high_school"
  const nhscaSelLeg = "athlete_name,placement,year,division,weight,high_school"
  // super32_results has weight_class + placement only (no `weight` or `place` columns)
  const s32Sel = "athlete_name,placement,year,weight_class,high_school,school,record,wins,losses"

  const namePairs = dualTokenPairsForNchsaa(q).slice(0, 4)
  const pairPromises = namePairs.map(({ first, last }) => {
    const pf = `%${escapeForIlike(first)}%`
    const pl = `%${escapeForIlike(last)}%`
    return admin
      .from("wrestling_nchsaa_results")
      .select(nchsaaSel)
      .ilike("wrestler_name", pf)
      .ilike("wrestler_name", pl)
      .order("year", { ascending: false })
      .limit(perTable)
  })

  // First+last token pairs so "Cam Stinson" matches DB "Cameron Stinson" (same as NCHSAA).
  const nhscaPlcPairPromises = namePairs.map(({ first, last }) => {
    const pf = `%${escapeForIlike(first)}%`
    const pl = `%${escapeForIlike(last)}%`
    return admin
      .from("nhsca_placements")
      .select(nhscaSelPlc)
      .ilike("athlete_name", pf)
      .ilike("athlete_name", pl)
      .order("year", { ascending: false })
      .limit(perTable)
  })
  const nhscaLegPairPromises = namePairs.map(({ first, last }) => {
    const pf = `%${escapeForIlike(first)}%`
    const pl = `%${escapeForIlike(last)}%`
    return admin
      .from("wrestling_nhsca_results")
      .select(nhscaSelLeg)
      .ilike("athlete_name", pf)
      .ilike("athlete_name", pl)
      .order("year", { ascending: false })
      .limit(perTable)
  })
  const s32PairPromises = namePairs.map(({ first, last }) => {
    const pf = `%${escapeForIlike(first)}%`
    const pl = `%${escapeForIlike(last)}%`
    return admin
      .from("super32_results")
      .select(s32Sel)
      .ilike("athlete_name", pf)
      .ilike("athlete_name", pl)
      .order("year", { ascending: false })
      .limit(perTable)
  })

  const [
    nchsaaByWrestler,
    nchsaaBySchool,
    ...nchsaaPairRes
  ] = await Promise.all([
    admin
      .from("wrestling_nchsaa_results")
      .select(nchsaaSel)
      .ilike("wrestler_name", pattern)
      .order("year", { ascending: false })
      .limit(perTable),
    admin
      .from("wrestling_nchsaa_results")
      .select(nchsaaSel)
      .ilike("school", pattern)
      .order("year", { ascending: false })
      .limit(perTable),
    ...pairPromises,
  ])

  const [
    plcByAthlete,
    plcBySchool,
    legByAthlete,
    legBySchool,
    s32ByAthlete,
    s32ByHighSchool,
    s32BySchoolCol,
    ...nhscaPlcPairRes
  ] = await Promise.all([
    admin.from("nhsca_placements").select(nhscaSelPlc).ilike("athlete_name", pattern).order("year", { ascending: false }).limit(perTable),
    admin.from("nhsca_placements").select(nhscaSelPlc).ilike("high_school", pattern).order("year", { ascending: false }).limit(perTable),
    admin.from("wrestling_nhsca_results").select(nhscaSelLeg).ilike("athlete_name", pattern).order("year", { ascending: false }).limit(perTable),
    admin.from("wrestling_nhsca_results").select(nhscaSelLeg).ilike("high_school", pattern).order("year", { ascending: false }).limit(perTable),
    admin.from("super32_results").select(s32Sel).ilike("athlete_name", pattern).order("year", { ascending: false }).limit(perTable),
    admin.from("super32_results").select(s32Sel).ilike("high_school", pattern).order("year", { ascending: false }).limit(perTable),
    admin.from("super32_results").select(s32Sel).ilike("school", pattern).order("year", { ascending: false }).limit(perTable),
    ...nhscaPlcPairPromises,
  ])

  const [nhscaLegPairRes, s32PairRes] = await Promise.all([
    Promise.all(nhscaLegPairPromises),
    Promise.all(s32PairPromises),
  ])

  const errors: string[] = []
  const noteErr = (res: { error?: { message?: string } | null }, label: string) => {
    if (!res.error) return
    const msg = res.error.message || ""
    if (msg.includes("does not exist") || msg.includes("42P01") || msg.includes("42703")) return
    errors.push(`${label}: ${msg}`)
  }

  const rowsOf = (res: { data?: unknown; error?: { message?: string } | null }): Record<string, unknown>[] =>
    res.error ? [] : ((res.data as Record<string, unknown>[]) ?? [])

  for (const [res, label] of [
    [nchsaaByWrestler, "nchsaa_by_wrestler"],
    [nchsaaBySchool, "nchsaa_by_school"],
    [plcByAthlete, "nhsca_placements_name"],
    [plcBySchool, "nhsca_placements_school"],
    [legByAthlete, "nhsca_legacy_name"],
    [legBySchool, "nhsca_legacy_school"],
    [s32ByAthlete, "super32_name"],
    [s32ByHighSchool, "super32_high_school"],
    [s32BySchoolCol, "super32_school_col"],
    ...nchsaaPairRes.map((r, i) => [r, `nchsaa_pair_${i}`] as const),
    ...nhscaPlcPairRes.map((r, i) => [r, `nhsca_plc_pair_${i}`] as const),
    ...nhscaLegPairRes.map((r, i) => [r, `nhsca_leg_pair_${i}`] as const),
    ...s32PairRes.map((r, i) => [r, `super32_pair_${i}`] as const),
  ] as Array<[{ error?: { message?: string } | null }, string]>) {
    noteErr(res, label)
  }

  const nchsaaBuckets: Record<string, unknown>[] = [
    ...rowsOf(nchsaaByWrestler),
    ...rowsOf(nchsaaBySchool),
    ...nchsaaPairRes.flatMap(rowsOf),
  ]
  const plcBuckets: Record<string, unknown>[] = [
    ...rowsOf(plcByAthlete),
    ...rowsOf(plcBySchool),
    ...nhscaPlcPairRes.flatMap(rowsOf),
  ]
  const legBuckets: Record<string, unknown>[] = [
    ...rowsOf(legByAthlete),
    ...rowsOf(legBySchool),
    ...nhscaLegPairRes.flatMap(rowsOf),
  ]
  const s32Buckets: Record<string, unknown>[] = [
    ...rowsOf(s32ByAthlete),
    ...rowsOf(s32ByHighSchool),
    ...rowsOf(s32BySchoolCol),
    ...s32PairRes.flatMap(rowsOf),
  ]

  const dirHsRaw = args.directory_high_school
  const directoryHs =
    typeof dirHsRaw === "string" && dirHsRaw.trim().length >= 3 ? dirHsRaw.trim() : ""
  const gyRaw = args.grad_year
  const parsedGrad =
    gyRaw != null && String(gyRaw).trim() !== "" && Number.isFinite(Number(gyRaw))
      ? Math.floor(Number(gyRaw))
      : null

  // Full NC United National Team results (UCD + NHSCA Duals National/Select, all years we have).
  let nc_united_results: Record<string, unknown>[] = []
  try {
    const ncRows = await loadNcUnitedResultsForNameSearch(admin, q, {
      highSchool: directoryHs || undefined,
      gradYear: parsedGrad,
    })
    nc_united_results = ncRows.map((r) => ({
      event: r.event,
      year: r.year,
      record: r.record,
      ...(r.weight ? { weight: r.weight } : {}),
      ...(r.isPlaceholder ? { isPlaceholder: true } : {}),
    }))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes("does not exist") && !msg.includes("42P01")) {
      errors.push(`nc_united_results: ${msg}`)
    }
  }

  const narrowOpts = {
    directoryHighSchool: directoryHs || undefined,
    gradYear: parsedGrad,
    displayName: q,
  }

  // School/year narrowing only when directory athlete is known; name match always uses query.
  const hasDirMatch = directoryHs != null || parsedGrad != null
  const safeNarrowOpts = hasDirMatch
    ? narrowOpts
    : { directoryHighSchool: undefined, gradYear: null, displayName: q }

  const nchsaa_state = dedupeByKey(nchsaaBuckets, (r) => {
    const x = r as Record<string, unknown>
    return `${x.wrestler_name}|${x.year}|${x.place}|${x.school}|${x.weight_class}`
  })

  const nhsca_placements = dedupeByKey(plcBuckets, (r) => {
    const x = r as Record<string, unknown>
    return `${x.athlete_name}|${x.year}|${x.placement}|${x.high_school}|${x.weight_class}`
  })

  const nhsca_legacy_table = dedupeByKey(legBuckets, (r) => {
    const x = r as Record<string, unknown>
    return `${x.athlete_name}|${x.year}|${x.placement}|${x.high_school}|${x.weight}`
  })

  const super32 = dedupeByKey(s32Buckets, (r) => {
    const x = r as Record<string, unknown>
    return `${x.athlete_name}|${x.year}|${x.placement ?? x.place}|${x.high_school ?? x.school}`
  })

  const nchsaa_state_narrowed = filterCrossStoreByDirectoryContext(nchsaa_state, safeNarrowOpts)
  const nhsca_placements_narrowed = filterCrossStoreByDirectoryContext(nhsca_placements, safeNarrowOpts)
  const nhsca_legacy_narrowed = filterCrossStoreByDirectoryContext(nhsca_legacy_table, safeNarrowOpts)
  const super32_narrowed = filterCrossStoreByDirectoryContext(super32, safeNarrowOpts)

  const narrowedNote =
    directoryHs || parsedGrad != null
      ? ` Rows were narrowed to the directory athlete when \`directory_high_school\` / \`grad_year\` were provided (school filter skips rows with blank school fields; year keeps grad−6…grad+1).`
      : ""

  const totalHits =
    nchsaa_state_narrowed.length +
    nhsca_placements_narrowed.length +
    nhsca_legacy_narrowed.length +
    super32_narrowed.length +
    nc_united_results.length

  return {
    searched_for: q,
    nchsaa_state: nchsaa_state_narrowed,
    nhsca_placements: nhsca_placements_narrowed,
    nhsca_legacy_table: nhsca_legacy_narrowed,
    super32: super32_narrowed,
    nc_united_results,
    /** @deprecated use nc_united_results (includes event/year/record for all NC United teams) */
    nc_united_roster: nc_united_results,
    total_hits: totalHits,
    ...(directoryHs || parsedGrad != null
      ? { narrow_filters: { directory_high_school: directoryHs || null, grad_year: parsedGrad } }
      : {}),
    ...(errors.length ? { partial_errors: errors.slice(0, 3) } : {}),
    note:
      "NCHSAA state = `wrestling_nchsaa_results`. NHSCA nationals = `nhsca_placements` + legacy `wrestling_nhsca_results`. Super32 = `super32_results`. NC United National Team = `nc_united_results` (Ultimate Club Duals + NHSCA Duals National/Select — event, year, record for every team appearance). Not NCHSAA **state** dual champions — use `nchsaa_dual_team_champions` for those. For a full merged athlete report when an id exists, call `get_athlete_full_dossier`." +
      narrowedNote,
  }
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
        ? "Four-time individual state champions: curated list of 17 through 2026, ordered earliest first title year first (Mike Kendall first, Cael Dunn last). List every wrestler in this order; do not reverse or alphabetize."
        : "Ordered by earliest title year first; titles within each wrestler are chronological.",
  }
}

const MAX_DUAL_LIST = 400
const MAX_DUAL_LEADERBOARD = 80

/** Models sometimes pass year as a string; PostgREST needs a numeric year filter. */
function coerceDualYear(raw: unknown): number | null {
  if (raw == null) return null
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw)
  if (typeof raw === "string") {
    const t = raw.trim()
    if (!t) return null
    const n = Number(t)
    if (Number.isFinite(n)) return Math.floor(n)
  }
  return null
}

function dualTeamChampionsBase(admin: ReturnType<typeof getSupabaseAdmin>) {
  return admin
    .from("dual_team_champions")
    .eq("is_vacated", false)
    .neq("champion_school", "No Dual Tournament")
    .or("held.is.null,held.eq.true")
    .not("champion_school", "is", null)
    .not("champion_school", "eq", "")
}

/**
 * NCHSAA **state** dual team championships (dual_team_champions). Not NHSCA national duals.
 */
export async function toolNchsaaDualTeamChampions(args: {
  year?: number | string | null
  division?: string | null
  school?: string | null
  leaderboard?: boolean | null
  limit?: number | null
}) {
  const admin = getSupabaseAdmin()
  const wantLeaderboard = Boolean(args.leaderboard)
  const yearFilter = coerceDualYear(args.year)

  if (wantLeaderboard) {
    const listCap = Math.min(Math.max(Number(args.limit) || MAX_DUAL_LEADERBOARD, 1), 200)
    const { data, error } = await dualTeamChampionsBase(admin).select("champion_school, year, division")

    if (error) {
      return { error: error.message, leaderboard: true, schools: [] as unknown[] }
    }

    let rows = (data ?? []) as Array<{ champion_school?: string; year?: number; division?: string }>
    if (yearFilter != null) {
      rows = rows.filter((r) => r.year === yearFilter)
    }
    if (args.division?.trim()) {
      const d = args.division.trim().toLowerCase()
      rows = rows.filter((r) => String(r.division ?? "").toLowerCase().includes(d))
    }
    if (args.school?.trim()) {
      const frag = args.school.trim().toLowerCase()
      rows = rows.filter((r) => String(r.champion_school ?? "").toLowerCase().includes(frag))
    }

    const counts = new Map<string, { count: number; years: number[] }>()
    for (const r of rows) {
      const s = String(r.champion_school ?? "").trim()
      if (!s) continue
      if (!counts.has(s)) counts.set(s, { count: 0, years: [] })
      const c = counts.get(s)!
      c.count++
      if (r.year != null && !c.years.includes(r.year)) c.years.push(r.year)
    }

    const schools = [...counts.entries()]
      .map(([school, v]) => ({
        school,
        title_count: v.count,
        years: v.years.sort((a, b) => b - a),
      }))
      .sort((a, b) => b.title_count - a.title_count || a.school.localeCompare(b.school))
      .slice(0, listCap)

    return {
      leaderboard: true,
      schools,
      total_schools_in_scope: counts.size,
      note: "NCHSAA state dual team titles (held tournaments only; non-vacated; no placeholder rows). This is not the NHSCA national dual meet.",
    }
  }

  const rowCap = Math.min(Math.max(Number(args.limit) || MAX_DUAL_LIST, 1), 500)

  let q = dualTeamChampionsBase(admin).select("year, division, champion_school")

  if (yearFilter != null) {
    q = q.eq("year", yearFilter)
  }
  if (args.division?.trim()) {
    q = q.ilike("division", `%${escapeForIlike(args.division.trim())}%`)
  }
  if (args.school?.trim()) {
    q = q.ilike("champion_school", `%${escapeForIlike(args.school.trim())}%`)
  }

  q = q.order("year", { ascending: false }).order("division", { ascending: true }).limit(rowCap)

  const { data, error } = await q
  if (error) {
    return { error: error.message, leaderboard: false, rows: [] as unknown[] }
  }

  const rows = data ?? []
  return {
    leaderboard: false,
    rows,
    count: rows.length,
    truncated: rows.length >= rowCap,
    limit_used: rowCap,
    year_filter_applied: yearFilter,
    note:
      rows.length === 0 && yearFilter != null
        ? "No dual team champions matched this year in the database (held tournaments only). If unexpected, the season may be stored under a different year or results may not be loaded yet."
        : "NCHSAA state dual team championships (held tournaments only; non-vacated). NHSCA national duals are a different tournament.",
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

export async function toolGetSchoolWrestlingDossier(args: { query: string }) {
  const q = sanitizeFragment(String(args.query ?? ""))
  return buildSchoolWrestlingDossierMarkdown(q)
}

function dedupeRecordBookRows(
  rows: Record<string, unknown>[],
  keyFn: (r: Record<string, unknown>) => string,
): Record<string, unknown>[] {
  const seen = new Set<string>()
  const out: Record<string, unknown>[] = []
  for (const r of rows) {
    const k = keyFn(r)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

export async function toolRecordBooksSearch(args: {
  mode?: string | null
  query?: string | null
  limit?: number | null
}) {
  const modeRaw = String(args.mode ?? "both").toLowerCase().trim()
  const mode =
    modeRaw === "career" || modeRaw === "single_season" || modeRaw === "both" ? modeRaw : "both"
  const rawQ = sanitizeFragment(String(args.query ?? ""))
  const q = (extractSearchablePhrase(rawQ) || stripConversationalNoise(rawQ)).trim()
  const hasQuery = q.length >= 2
  const limit = Math.min(
    Math.max(Number(args.limit) || (hasQuery ? 25 : 10), 1),
    hasQuery ? 50 : 100,
  )
  const fetchCap = Math.min(limit * 3, 200)
  const admin = getSupabaseAdmin()
  const out: {
    mode: string
    searched_for: string | null
    career_winningest: unknown[]
    single_season_winningest: unknown[]
    partial_errors?: string[]
    note: string
  } = {
    mode,
    searched_for: hasQuery ? q : null,
    career_winningest: [],
    single_season_winningest: [],
    note: "career_winningest_wrestlers = all-time career wins; winningest_wrestlers = best single season.",
  }
  const errors: string[] = []
  const ilikeFrag = hasQuery ? escapeForIlike(q) : ""

  if (mode === "career" || mode === "both") {
    let cq = admin
      .from("career_winningest_wrestlers")
      .select("rank, name, school, record, wins, losses, years")
      .order("rank", { ascending: true })
      .limit(fetchCap)
    if (hasQuery) {
      cq = cq.or(`name.ilike.%${ilikeFrag}%,school.ilike.%${ilikeFrag}%`)
    }
    const { data, error } = await cq
    if (error) {
      if (!error.message.includes("does not exist") && !error.message.includes("42P01")) {
        errors.push(`career: ${error.message}`)
      }
    } else {
      out.career_winningest = dedupeRecordBookRows(data ?? [], (r) =>
        `${r.rank}|${r.name}|${r.record}|${r.school}|${r.years}`,
      ).slice(0, limit)
    }
  }

  if (mode === "single_season" || mode === "both") {
    let sq = admin
      .from("winningest_wrestlers")
      .select("rank_numeric, wrestler_name, school, record, wins, losses, year")
      .order("wins", { ascending: false })
      .limit(fetchCap)
    if (hasQuery) {
      sq = sq.or(`wrestler_name.ilike.%${ilikeFrag}%,school.ilike.%${ilikeFrag}%`)
    }
    const { data, error } = await sq
    if (error) {
      if (!error.message.includes("does not exist") && !error.message.includes("42P01")) {
        errors.push(`single_season: ${error.message}`)
      }
    } else {
      out.single_season_winningest = dedupeRecordBookRows(data ?? [], (r) =>
        `${r.rank_numeric}|${r.wrestler_name}|${r.record}|${r.school}|${r.year}`,
      ).slice(0, limit)
    }
  }

  if (errors.length) out.partial_errors = errors
  return out
}

async function toolExcellenceAwardSearch(
  table: "dave_schultz_award" | "tricia_saunders_award",
  awardLabel: string,
  args: { query?: string | null; year?: number | null; limit?: number | null },
) {
  const rawQ = sanitizeFragment(String(args.query ?? ""))
  const q = (extractSearchablePhrase(rawQ) || stripConversationalNoise(rawQ)).trim()
  const hasQuery = q.length >= 2
  const year =
    args.year != null && Number.isFinite(Number(args.year)) ? Math.floor(Number(args.year)) : null
  const limit = Math.min(Math.max(Number(args.limit) || (hasQuery || year != null ? 50 : 100), 1), 500)
  const admin = getSupabaseAdmin()

  let query = admin
    .from(table)
    .select("year, name, high_school, college, city")
    .order("year", { ascending: false })
    .limit(limit)

  if (year != null) query = query.eq("year", year)
  if (hasQuery) {
    const frag = escapeForIlike(q)
    query = query.or(`name.ilike.%${frag}%,high_school.ilike.%${frag}%`)
  }

  const { data, error } = await query
  if (error) {
    if (error.message.includes("does not exist") || error.message.includes("42P01")) {
      return {
        award: awardLabel,
        rows: [] as unknown[],
        searched_for: hasQuery ? q : null,
        year_filter: year,
        error: `${awardLabel} table not available in this database.`,
      }
    }
    // city column may be missing on some envs
    if (error.message.includes("city") || error.code === "42703") {
      let q2 = admin
        .from(table)
        .select("year, name, high_school, college")
        .order("year", { ascending: false })
        .limit(limit)
      if (year != null) q2 = q2.eq("year", year)
      if (hasQuery) {
        const frag = escapeForIlike(q)
        q2 = q2.or(`name.ilike.%${frag}%,high_school.ilike.%${frag}%`)
      }
      const retry = await q2
      if (retry.error) {
        return {
          award: awardLabel,
          rows: [] as unknown[],
          searched_for: hasQuery ? q : null,
          year_filter: year,
          error: retry.error.message,
        }
      }
      return {
        award: awardLabel,
        rows: retry.data ?? [],
        count: (retry.data ?? []).length,
        searched_for: hasQuery ? q : null,
        year_filter: year,
        note: `${awardLabel} winners (NC).`,
      }
    }
    return {
      award: awardLabel,
      rows: [] as unknown[],
      searched_for: hasQuery ? q : null,
      year_filter: year,
      error: error.message,
    }
  }

  return {
    award: awardLabel,
    rows: data ?? [],
    count: (data ?? []).length,
    searched_for: hasQuery ? q : null,
    year_filter: year,
    note: `${awardLabel} winners (NC).`,
  }
}

export async function toolDaveSchultzAwardSearch(args: {
  query?: string | null
  year?: number | null
  limit?: number | null
}) {
  return toolExcellenceAwardSearch("dave_schultz_award", "Dave Schultz High School Excellence Award", args)
}

export async function toolTriciaSaundersAwardSearch(args: {
  query?: string | null
  year?: number | null
  limit?: number | null
}) {
  return toolExcellenceAwardSearch(
    "tricia_saunders_award",
    "Tricia Saunders High School Excellence Award",
    args,
  )
}

export type DataToolName =
  | "search_athletes"
  | "wrestling_cross_store_search"
  | "search_school_classifications"
  | "get_school_wrestling_dossier"
  | "nchsaa_dual_team_champions"
  | "nhsca_placements_search"
  | "nchsaa_state_results_search"
  | "nchsaa_multi_time_state_champions"
  | "college_commits_search"
  | "get_athlete_full_dossier"
  | "record_books_search"
  | "dave_schultz_award_search"
  | "tricia_saunders_award_search"

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
      case "wrestling_cross_store_search":
        return JSON.stringify(
          await toolWrestlingCrossStoreSearch(
            args as {
              query: string
              limit?: number
              directory_high_school?: string
              grad_year?: number | string | null
            },
          ),
        )
      case "search_school_classifications":
        return JSON.stringify(
          await toolSearchSchoolClassifications(args as { query: string; limit?: number }),
        )
      case "get_school_wrestling_dossier":
        return JSON.stringify(
          await toolGetSchoolWrestlingDossier(args as { query: string }),
        )
      case "nchsaa_dual_team_champions":
        return JSON.stringify(
          await toolNchsaaDualTeamChampions(
            args as {
              year?: number | string | null
              division?: string | null
              school?: string | null
              leaderboard?: boolean | null
              limit?: number | null
            },
          ),
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
      case "record_books_search":
        return JSON.stringify(
          await toolRecordBooksSearch(
            args as { mode?: string | null; query?: string | null; limit?: number | null },
          ),
        )
      case "dave_schultz_award_search":
        return JSON.stringify(
          await toolDaveSchultzAwardSearch(
            args as { query?: string | null; year?: number | null; limit?: number | null },
          ),
        )
      case "tricia_saunders_award_search":
        return JSON.stringify(
          await toolTriciaSaundersAwardSearch(
            args as { query?: string | null; year?: number | null; limit?: number | null },
          ),
        )
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return JSON.stringify({ error: msg })
  }
}
