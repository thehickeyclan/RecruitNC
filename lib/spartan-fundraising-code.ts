/**
 * Spartan fundraising codes: NCU-{LAST}-{YY} with first-initial + numeric suffix when needed.
 * Logic matches scripts/generate-spartan-fundraising-sql.mjs (deterministic order: athlete id).
 */

import type { SupabaseClient } from "@supabase/supabase-js"

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

  const keyCounts = new Map<string, number>()
  for (const r of rows) {
    const k = `${r.lastSan}|${r.gradYear}`
    keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1)
  }

  const codes = new Set<string>()
  const out: FundraisingAthleteEntry[] = []

  for (const r of rows) {
    const k = `${r.lastSan}|${r.gradYear}`
    const collision = (keyCounts.get(k) ?? 0) > 1
    const fi = (r.firstName || "?")[0]?.toUpperCase() || "X"
    const base = collision ? `${r.lastSan}${fi}` : r.lastSan
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

async function loadEntries(admin: SupabaseClient): Promise<FundraisingAthleteEntry[]> {
  const rows = await fetchAllAthleteRows(admin)
  return buildFundraisingEntries(rows)
}

/** Cached full roster → fundraising entries (refreshed every ~5 min). */
/** Map NCU fundraising code → directory full name for public labels (keys: exact + UPPERCASE). */
export function fundraisingCodeToFullNameMap(entries: FundraisingAthleteEntry[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const e of entries) {
    const n = e.fullName.trim()
    if (!n) continue
    m.set(e.code, n)
    m.set(e.code.toUpperCase(), n)
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
  inflight = loadEntries(admin)
    .then((entries) => {
      cache = { entries, builtAt: Date.now() }
      return entries
    })
    .finally(() => {
      inflight = null
    })
  return inflight
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
    return a.e.label.localeCompare(b.e.label)
  })

  const seen = new Set<string>()
  const out: { code: string; label: string }[] = []
  for (const { e } of scored) {
    if (seen.has(e.code)) continue
    seen.add(e.code)
    out.push({ code: e.code, label: e.label })
    if (out.length >= limit) break
  }
  return out
}
