/**
 * Spartan fundraising codes: NCU-{LAST}-{YY}, with collision handling when multiple athletes
 * share last name + grad year: append a minimal unique prefix of the first name (letters only),
 * e.g. Aidan vs Addison Gore → NCU-GOREAI-YY and NCU-GOREAD-YY (not NCU-GOREA-YY vs NCU-GOREA2-YY).
 * Keep scripts/generate-spartan-fundraising-sql.mjs in sync when changing rules.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { fundraisingDirectoryIdentityKey, ncuCodeGradYearSuffix } from "@/lib/fundraising/fundraising-directory-identity"

export function sanitizeLast(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 24)
}

export function parseNameFromAthleteName(name: string | null | undefined): { firstName: string; lastName: string } | null {
  if (!name?.trim()) return null
  const t = name.trim()
  if (t.includes(",")) {
    const [a, b] = t.split(",").map((s) => s.trim())
    if (a && b) return { lastName: a, firstName: b }
    return { lastName: t.replace(/,/g, "").trim(), firstName: "" }
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return { firstName: "", lastName: parts[0] }
  return { firstName: parts[0], lastName: parts[parts.length - 1] }
}

export type AthleteFundraisingSource = {
  id: string
  name: string | null | undefined
  graduationyear: number | null | undefined
  highschool?: string | null | undefined
}

export type FundraisingAthleteEntry = {
  id: string
  code: string
  label: string
  /** First + last from directory (e.g. "Gavin Hickey") — public supporter tables prefer this over abbreviated `label`. */
  fullName: string
  /** Lowercased name + code + school for substring search */
  searchBlob: string
}

function toDisplayFullName(raw: string): string {
  const t = raw.trim()
  if (!t) return ""
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function coalesceGradYear(raw: unknown): number | null {
  if (raw == null) return null
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 1990 || n > 2050) return null
  return n
}

/**
 * First-name letters only (A–Z), then take the first `len` characters (for code base disambiguation).
 */
export function sanitizeFirstPrefixForCode(firstName: string, len: number): string {
  const letters = (firstName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
  if (!letters.length) return "X"
  return letters.slice(0, Math.max(1, len))
}

const MAX_PREFIX_LEN = 20

type CollisionMember = { id: string; firstName: string }

/**
 * For same (last name + grad year), build a unique base = lastSan + first-name prefix
 * with minimal length L so all bases in the group differ (e.g. GORE + AI vs GORE + AD).
 * Members sorted by `id` for deterministic tie-breaks only in the rare fallback case.
 */
export function buildCollisionBasesByAthleteId(lastSan: string, members: CollisionMember[]): Map<string, string> {
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id))
  const firstNames = sorted.map((m) => m.firstName || "")
  const m = new Map<string, string>()

  for (let L = 1; L <= MAX_PREFIX_LEN; L++) {
    const bases = firstNames.map((fn) => lastSan + sanitizeFirstPrefixForCode(fn, L))
    if (new Set(bases).size === sorted.length) {
      sorted.forEach((row, i) => m.set(row.id, bases[i]))
      return m
    }
  }
  // Extremely rare: fall back to lastSan + V1, V2, …
  sorted.forEach((row, i) => m.set(row.id, `${lastSan}V${i + 1}`))
  return m
}

/**
 * Assign fundraising codes to every athlete row (same rules as CSV generator).
 * Rows must be the full roster so collision groups are correct.
 */
export function buildFundraisingEntries(sources: AthleteFundraisingSource[]): FundraisingAthleteEntry[] {
  type Row = {
    id: string
    firstName: string
    lastName: string
    gradYear: number
    school: string
    lastSan: string
  }

  const rows: Row[] = []
  for (const s of sources) {
    const parsed = parseNameFromAthleteName(s.name ?? null)
    if (!parsed) continue
    const gradYear = coalesceGradYear(s.graduationyear)
    if (!gradYear) continue
    const lastSan = sanitizeLast(parsed.lastName)
    if (!lastSan) continue
    const school = (s.highschool ?? "").trim().slice(0, 120)
    rows.push({
      id: s.id,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      gradYear,
      school,
      lastSan,
    })
  }

  rows.sort((a, b) => a.id.localeCompare(b.id))

  const groupKey = (r: Row) => `${r.lastSan}|${r.gradYear}`
  const byKey = new Map<string, Row[]>()
  for (const r of rows) {
    const k = groupKey(r)
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(r)
  }

  const baseByAthleteId = new Map<string, string>()
  for (const [, group] of byKey) {
    if (group.length === 1) {
      baseByAthleteId.set(group[0].id, group[0].lastSan)
    } else {
      const subMap = buildCollisionBasesByAthleteId(
        group[0].lastSan,
        group.map((g) => ({ id: g.id, firstName: g.firstName })),
      )
      for (const [id, b] of subMap) baseByAthleteId.set(id, b)
    }
  }

  const codes = new Set<string>()
  const out: FundraisingAthleteEntry[] = []

  for (const r of rows) {
    const base = baseByAthleteId.get(r.id) ?? r.lastSan
    const yy = String(r.gradYear).slice(-2)
    let code = `NCU-${base}-${yy}`
    let n = 2
    while (codes.has(code)) {
      code = `NCU-${base}${n}-${yy}`
      n++
    }
    codes.add(code)

    const fn = r.firstName.trim()
    const ln = r.lastName.trim()
    const initial = fn ? `${fn[0]}. ` : ""
    const label = r.school
      ? `${initial}${ln} '${yy} · ${r.school}`
      : `${initial}${ln} '${yy}`

    const fullName = toDisplayFullName([fn, ln].filter(Boolean).join(" "))

    const searchBlob = [code, r.firstName, r.lastName, r.school, String(r.gradYear), label, fullName]
      .join(" ")
      .toLowerCase()

    out.push({ id: r.id, code, label, fullName, searchBlob })
  }

  return out
}

const PAGE = 1000
const CACHE_TTL_MS = 5 * 60 * 1000

type CachedIndex = {
  entries: FundraisingAthleteEntry[]
  builtAt: number
}

let cache: CachedIndex | null = null
let inflight: Promise<FundraisingAthleteEntry[]> | null = null
/** Bumped on invalidate so stale in-flight loads cannot overwrite cache after a pin/admin change. */
let cacheInvalidationGeneration = 0

/** Call after changing `spartan_fundraising_athletes` so admin/playbook picks up pins immediately. */
export function invalidateFundraisingAthleteEntriesCache(): void {
  cache = null
  inflight = null
  cacheInvalidationGeneration++
}

function rowToSource(row: Record<string, unknown>): AthleteFundraisingSource {
  const gy = row.graduationyear ?? row.graduation_year
  const hs = row.highschool ?? row.high_school
  return {
    id: String(row.id ?? ""),
    name: typeof row.name === "string" ? row.name : row.name == null ? undefined : String(row.name),
    graduationyear: coalesceGradYear(gy) ?? undefined,
    highschool: typeof hs === "string" ? hs : hs == null ? undefined : String(hs),
  }
}

async function fetchAllAthleteRows(admin: SupabaseClient): Promise<AthleteFundraisingSource[]> {
  const all: AthleteFundraisingSource[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await admin
      .from("athletes")
      .select("id, name, graduationyear, highschool")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1)

    if (error) {
      throw new Error(error.message)
    }
    const chunk = data ?? []
    for (const row of chunk) {
      const src = rowToSource(row as Record<string, unknown>)
      if (src.id) all.push(src)
    }
    if (chunk.length < PAGE) break
    offset += PAGE
  }
  return all
}

const ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SpartanFundraisingAthleteRow = {
  code?: string | null
  first_name?: string | null
  last_name?: string | null
  grad_year?: number | null
  school?: string | null
  active?: boolean | null
  /** When set, fundraising playbook treats this NCU row as that RecruitNC profile (parent links work). */
  athlete_id?: string | null
}

function spartanFundraisingRowToEntry(r: SpartanFundraisingAthleteRow): FundraisingAthleteEntry | null {
  const code = typeof r.code === "string" ? r.code.trim() : ""
  if (!code) return null
  if (r.active === false) return null
  const gy = coalesceGradYear(r.grad_year)
  if (!gy) return null
  const fn = (typeof r.first_name === "string" ? r.first_name : "").trim()
  const ln = (typeof r.last_name === "string" ? r.last_name : "").trim()
  if (!ln) return null
  const yy = String(gy).slice(-2)
  const school = (typeof r.school === "string" ? r.school : "").trim().slice(0, 120)
  const initial = fn ? `${fn[0]}. ` : ""
  const label = school
    ? `${initial}${ln} '${yy} · ${school}`
    : `${initial}${ln} '${yy}`
  const fullName = toDisplayFullName([fn, ln].filter(Boolean).join(" "))
  const searchBlob = [code, fn, ln, school, String(gy), label, fullName].join(" ").toLowerCase()
  const aid = typeof r.athlete_id === "string" ? r.athlete_id.trim() : ""
  const id = ATHLETE_UUID_RE.test(aid) ? aid : `spartan-fundraising:${code}`
  return { id, code, label, fullName, searchBlob }
}

/** Roster-only racers from `spartan_fundraising_athletes` (not every athlete has a RecruitNC profile). */
async function loadSpartanFundraisingExtras(admin: SupabaseClient): Promise<FundraisingAthleteEntry[]> {
  try {
    let res = await admin
      .from("spartan_fundraising_athletes")
      .select("code, first_name, last_name, grad_year, school, active, athlete_id")
      .eq("active", true)
    if (res.error && /athlete_id|schema cache/i.test(res.error.message)) {
      res = await admin
        .from("spartan_fundraising_athletes")
        .select("code, first_name, last_name, grad_year, school, active")
        .eq("active", true)
    }
    const { data, error } = res
    if (error) {
      console.error("[spartan-fundraising] spartan_fundraising_athletes:", error.message)
      return []
    }
    const out: FundraisingAthleteEntry[] = []
    for (const row of data ?? []) {
      const e = spartanFundraisingRowToEntry(row as SpartanFundraisingAthleteRow)
      if (e) out.push(e)
    }
    return out
  } catch (e) {
    console.error("[spartan-fundraising] loadSpartanFundraisingExtras", e)
    return []
  }
}

/**
 * Prefer fuller public names when the same NCU code exists on both `athletes` and `spartan_fundraising_athletes`.
 * Exported for Vitest — changing this without updating `lib/spartan-fundraising-display.test.ts` should fail CI.
 */
export function mergeFundraisingAthleteEntries(
  fromAthletes: FundraisingAthleteEntry[],
  extras: FundraisingAthleteEntry[],
): FundraisingAthleteEntry[] {
  const norm = (c: string) => c.trim().toLowerCase()
  const richness = (full: string): number => {
    const t = full.trim()
    if (!t) return -1e9
    const words = t.split(/\s+/).filter(Boolean)
    let score = t.length + words.length * 8
    const first = words[0] ?? ""
    if (/^[A-Za-z]\.$/.test(first)) score -= 28
    if (first.length === 1) score -= 18
    if (first.length >= 3) score += 38
    if (/\s+'\d{2}\s*$/.test(t)) score -= 22
    return score
  }
  type Best = { entry: FundraisingAthleteEntry; score: number }
  const byNorm = new Map<string, Best>()
  const consider = (e: FundraisingAthleteEntry) => {
    const k = norm(e.code)
    if (!k) return
    const q = richness(e.fullName)
    const cur = byNorm.get(k)
    if (!cur || q > cur.score) byNorm.set(k, { entry: e, score: q })
  }
  for (const e of fromAthletes) consider(e)
  for (const e of extras) consider(e)
  return [...byNorm.values()].map((b) => b.entry)
}

async function loadEntries(admin: SupabaseClient): Promise<FundraisingAthleteEntry[]> {
  const rows = await fetchAllAthleteRows(admin)
  const fromAthletes = buildFundraisingEntries(rows)
  let extras: FundraisingAthleteEntry[] = []
  try {
    extras = await loadSpartanFundraisingExtras(admin)
  } catch (e) {
    console.error("[spartan-fundraising] loadSpartanFundraisingExtras failed", e)
  }
  try {
    const merged = mergeFundraisingAthleteEntries(fromAthletes, extras)
    return enrichRosterOnlyEntriesWithCanonicalAthleteNames(merged, fromAthletes, rows)
  } catch (e) {
    console.error("[spartan-fundraising] merge/enrich failed — athlete directory only", e)
    return enrichRosterOnlyEntriesWithCanonicalAthleteNames(fromAthletes, fromAthletes, rows)
  }
}

/**
 * Public /spartan: strip directory suffix (` · School…`) and trailing ` 'YY` from picker / label strings.
 */
export function normalizeSpartanPublicAthleteDisplay(raw: string | null | undefined): string {
  let s = raw?.trim() ?? ""
  if (!s) return ""
  const idx = s.indexOf(" · ")
  if (idx > 0) s = s.slice(0, idx).trim()
  s = s.replace(/\s+'\d{2}\s*$/, "").trim()
  return s
}

/** Two-digit year in code/label → calendar grad year (HS cohorts: 00–49 → 2000s, 50–99 → 1900s). */
function inferGradYearFromTwoDigit(yy: number): number | null {
  if (!Number.isFinite(yy) || yy < 0 || yy > 99) return null
  return yy >= 50 ? 1900 + yy : 2000 + yy
}

function inferGradYearFromFundraisingCode(code: string): number | null {
  const m = /^NCU-[A-Za-z0-9]+-(\d{2})$/i.exec(code.trim())
  if (!m) return null
  return inferGradYearFromTwoDigit(Number.parseInt(m[1], 10))
}

/** Prefer grad year from label (`'27 · …`) so `NCU-*-31` matches class of 2031, not 1931. */
function inferGradYearFromFundraisingEntry(e: FundraisingAthleteEntry): number | null {
  const fromLabel = /'(\d{2})(?:\s*·|\s*$)/.exec(e.label)
  if (fromLabel) return inferGradYearFromTwoDigit(Number.parseInt(fromLabel[1], 10))
  return inferGradYearFromFundraisingCode(e.code)
}

function firstLetterFromName(name: string): string {
  const m = /[a-zA-Z]/.exec(name ?? "")
  return m ? m[0].toUpperCase() : ""
}

function parsedNameFromRosterOnlyEntry(e: FundraisingAthleteEntry): { firstName: string; lastName: string } | null {
  const fromFull = parseNameFromAthleteName(e.fullName)
  if (fromFull?.lastName) return fromFull
  return parseNameFromAthleteName(normalizeSpartanPublicAthleteDisplay(e.label))
}

/**
 * Stripe often credits `spartan_fundraising_athletes.code` (e.g. NCU-ADAMSM-27) while the same kid has a full
 * `athletes` profile whose computed code is NCU-ADAMS-27. Merge keeps the manual row — patch `fullName` from the
 * matching profile when grad year + last name (+ first initial) uniquely identify one athlete.
 */
export function enrichRosterOnlyEntriesWithCanonicalAthleteNames(
  entries: FundraisingAthleteEntry[],
  fromAthletes: FundraisingAthleteEntry[],
  sources: AthleteFundraisingSource[],
): FundraisingAthleteEntry[] {
  const feById = new Map(fromAthletes.map((x) => [x.id, x]))
  return entries.map((e) => {
    if (!e.id.startsWith("spartan-fundraising:")) return e
    const inferredGy = inferGradYearFromFundraisingEntry(e)
    const extraParsed = parsedNameFromRosterOnlyEntry(e)
    if (inferredGy == null || !extraParsed?.lastName) return e

    const lastSanExtra = sanitizeLast(extraParsed.lastName)
    if (!lastSanExtra) return e

    const candidates = sources.filter((s) => {
      const gy = coalesceGradYear(s.graduationyear)
      if (gy !== inferredGy) return false
      const p = parseNameFromAthleteName(s.name ?? null)
      if (!p?.lastName) return false
      return sanitizeLast(p.lastName) === lastSanExtra
    })

    let pick: AthleteFundraisingSource | null = null
    if (candidates.length === 1) pick = candidates[0]!
    else if (candidates.length > 1) {
      const want = firstLetterFromName(extraParsed.firstName)
      const refined = candidates.filter((s) => {
        const p = parseNameFromAthleteName(s.name ?? null)
        return p && firstLetterFromName(p.firstName) === want && want !== ""
      })
      if (refined.length === 1) pick = refined[0]!
    }

    if (!pick) return e

    const fe = feById.get(pick.id)
    if (fe?.fullName.trim()) {
      return { ...e, fullName: fe.fullName.trim() }
    }

    const p = parseNameFromAthleteName(pick.name ?? null)
    if (!p?.lastName) return e
    const display = toDisplayFullName([p.firstName, p.lastName].filter(Boolean).join(" "))
    return display.trim() ? { ...e, fullName: display.trim() } : e
  })
}

/** Prefer fuller names over `M. Last` / checkout abbreviations (shared with Stripe hint scoring). */
export function scoreSpartanPublicDisplayRichness(s: string): number {
  const t = s.trim()
  if (!t) return -1e9
  const words = t.split(/\s+/).filter(Boolean)
  let score = t.length + words.length * 8
  const first = words[0] ?? ""
  if (/^[A-Za-z]\.$/.test(first)) score -= 28
  if (first.length === 1) score -= 18
  if (first.length >= 3) score += 38
  if (/\s+'\d{2}\s*$/.test(t)) score -= 22
  if (t.includes(" · ")) score -= 35
  return score
}

function pickRicherSpartanPublicDisplay(a: string, b: string): string {
  const sa = scoreSpartanPublicDisplayRichness(a)
  const sb = scoreSpartanPublicDisplayRichness(b)
  if (sb > sa) return b
  if (sa > sb) return a
  return a.length >= b.length ? a : b
}

/** Cached full roster → fundraising entries (refreshed every ~5 min). */
/**
 * Map NCU fundraising code → best public display name.
 * Uses richer of `fullName` vs normalized `label`; never drops a code solely because `fullName` was blank.
 */
export function fundraisingCodeToFullNameMap(entries: FundraisingAthleteEntry[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const e of entries) {
    const code = e.code.trim()
    if (!code) continue
    const full = e.fullName.trim()
    const fromLabel = normalizeSpartanPublicAthleteDisplay(e.label)
    let best = ""
    if (full && fromLabel) best = pickRicherSpartanPublicDisplay(full, fromLabel)
    else best = full || fromLabel
    if (!best) continue
    best = normalizeSpartanPublicAthleteDisplay(best) || best
    m.set(code, best)
    m.set(code.toUpperCase(), best)
    m.set(code.toLowerCase(), best)
  }
  return m
}

export async function getFundraisingAthleteEntries(admin: SupabaseClient): Promise<FundraisingAthleteEntry[]> {
  const now = Date.now()
  if (cache && now - cache.builtAt < CACHE_TTL_MS) {
    return cache.entries
  }
  if (inflight) {
    return inflight
  }
  const generationAtStart = cacheInvalidationGeneration
  const rosterPromise = loadEntries(admin)
  const tracked = rosterPromise
    .then((entries) => {
      if (generationAtStart === cacheInvalidationGeneration) {
        cache = { entries, builtAt: Date.now() }
      }
      return entries
    })
    .finally(() => {
      if (inflight === tracked) inflight = null
    })
  inflight = tracked
  return tracked
}

export function filterFundraisingEntriesByQuery(
  entries: FundraisingAthleteEntry[],
  q: string,
  limit: number,
): { code: string; label: string }[] {
  const ql = q.toLowerCase().trim()
  if (ql.length < 2) return []

  const scored = entries
    .map((e) => {
      const blob = e.searchBlob
      if (!blob.includes(ql)) return null
      const codeL = e.code.toLowerCase()
      const labelL = e.label.toLowerCase()
      let rank = 2
      if (codeL.startsWith(ql)) rank = 0
      else if (labelL.includes(ql)) rank = 1
      return { e, rank }
    })
    .filter((x): x is { e: FundraisingAthleteEntry; rank: number } => x != null)

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    const yb = ncuCodeGradYearSuffix(b.e.code)
    const ya = ncuCodeGradYearSuffix(a.e.code)
    if (yb !== ya) return yb - ya
    return b.e.code.localeCompare(a.e.code)
  })

  const seenCode = new Set<string>()
  const seenPinnedAthleteId = new Set<string>()
  const seenVisualIdentity = new Set<string>()
  const out: { code: string; label: string }[] = []
  for (const { e } of scored) {
    const codeKey = e.code.trim().toLowerCase()
    if (seenCode.has(codeKey)) continue
    if (ATHLETE_UUID_RE.test(e.id)) {
      if (seenPinnedAthleteId.has(e.id)) continue
      seenPinnedAthleteId.add(e.id)
    }
    const schoolPart = e.label.includes("·") ? e.label.split("·").slice(1).join("·").trim() : null
    const vid = fundraisingDirectoryIdentityKey(e.fullName || e.label, schoolPart, e.id)
    if (seenVisualIdentity.has(vid)) continue
    seenVisualIdentity.add(vid)
    seenCode.add(codeKey)
    out.push({ code: e.code, label: e.label })
    if (out.length >= limit) break
  }
  return out
}
