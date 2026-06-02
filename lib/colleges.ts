/**
 * Colleges table — single source of truth for college name and division.
 * Use for reads; athlete writes should set college_id (or resolve name → college_id).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { College } from "@/types/college"

export type CollegeRow = {
  id: string
  name: string
  division: string
  logo_url?: string | null
  slug?: string | null
  created_at?: string
  updated_at?: string
}

function mapRow(row: Record<string, unknown>): CollegeRow {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    division: String(row.division ?? ""),
    logo_url: row.logo_url != null ? String(row.logo_url) : null,
    slug: row.slug != null ? String(row.slug) : null,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  }
}

export async function getCollegeById(
  supabase: SupabaseClient,
  id: string | null | undefined
): Promise<CollegeRow | null> {
  if (!id) return null
  const { data, error } = await supabase.from("colleges").select("*").eq("id", id).maybeSingle()
  if (error || !data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function getCollegesByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, CollegeRow>> {
  const uniq = [...new Set(ids)].filter(Boolean)
  if (uniq.length === 0) return new Map()
  const { data, error } = await supabase.from("colleges").select("*").in("id", uniq)
  if (error || !data || !Array.isArray(data)) return new Map()
  const map = new Map<string, CollegeRow>()
  for (const row of data) {
    const c = mapRow(row as Record<string, unknown>)
    map.set(c.id, c)
  }
  return map
}

/** Minimum graduation year shown when year filter is "all" (matches /colleges banner). */
export const COLLEGE_LEADERBOARD_MIN_CLASS_YEAR = 2025

function normalizeCollegeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(university|college|state|tech|of)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export async function getAllColleges(supabase: SupabaseClient): Promise<CollegeRow[]> {
  const { data, error } = await supabase.from("colleges").select("*")
  if (error || !data || !Array.isArray(data)) return []
  return data.map((row) => mapRow(row as Record<string, unknown>))
}

/** Index colleges by lowercase and normalized name for athlete.college string lookup. */
export function buildCollegeNameLookup(colleges: CollegeRow[]): Map<string, CollegeRow> {
  const lookup = new Map<string, CollegeRow>()
  for (const college of colleges) {
    const raw = college.name.toLowerCase().trim()
    if (raw && !lookup.has(raw)) lookup.set(raw, college)
    const norm = normalizeCollegeNameKey(college.name)
    if (norm && !lookup.has(norm)) lookup.set(norm, college)
  }
  return lookup
}

function collegeNameLookupVariants(name: string): string[] {
  const lower = name.toLowerCase().trim()
  const variants = new Set<string>([lower, normalizeCollegeNameKey(name)])
  variants.add(lower.replace(/\bnc\b/g, "north carolina"))
  variants.add(lower.replace(/\bnorth carolina\b/g, "nc"))
  variants.add(lower.replace(/\bunc\b/g, "university of north carolina"))
  variants.add(lower.replace(/\buniversity of north carolina\b/g, "unc"))
  variants.add(lower.replace(/\bnc state\b/g, "north carolina state"))
  variants.add(lower.replace(/\bnorth carolina state\b/g, "nc state"))
  return [...variants].filter(Boolean)
}

/** Exact / normalized / alias lookup only — avoids UNC vs UNC Pembroke substring false positives. */
export function resolveCollegeByName(name: string, lookup: Map<string, CollegeRow>): CollegeRow | null {
  const trimmed = name.trim()
  if (!trimmed) return null

  const raw = trimmed.toLowerCase()
  const direct = lookup.get(raw)
  if (direct) return direct

  const norm = normalizeCollegeNameKey(trimmed)
  const normMatch = lookup.get(norm)
  if (normMatch) return normMatch

  for (const variant of collegeNameLookupVariants(trimmed)) {
    const hit = lookup.get(variant) ?? lookup.get(normalizeCollegeNameKey(variant))
    if (hit) return hit
  }

  return null
}

export type CollegeCommitGroupInfo = {
  /** Stable bucket key — same function for leaderboard grouping and expand filter */
  groupKey: string
  displayName: string
  collegeId: string | null
}

/** Resolve one athlete to a college commit bucket (prefer colleges.id). */
export function resolveCollegeCommitGroup(
  athlete: { college_id?: string | null; college?: string | null },
  collegesById: Map<string, CollegeRow>,
  collegesByName: Map<string, CollegeRow>,
): CollegeCommitGroupInfo {
  const collegeText = String(athlete.college ?? "").trim()

  if (athlete.college_id) {
    const id = String(athlete.college_id)
    const row = collegesById.get(id)
    if (row) {
      return { groupKey: `id:${id}`, displayName: row.name, collegeId: id }
    }
  }

  if (collegeText) {
    const resolved = resolveCollegeByName(collegeText, collegesByName)
    if (resolved) {
      return { groupKey: `id:${resolved.id}`, displayName: resolved.name, collegeId: resolved.id }
    }
    return {
      groupKey: `name:${collegeText.toLowerCase()}`,
      displayName: collegeText,
      collegeId: null,
    }
  }

  return { groupKey: "unknown", displayName: "Unknown", collegeId: null }
}

export function resolveAthleteCollegeDivision(
  athlete: { college_id?: string | null; college?: string | null },
  collegesById: Map<string, CollegeRow>,
  collegesByName: Map<string, CollegeRow>,
): string | null {
  if (athlete.college_id) {
    const fromId = collegesById.get(String(athlete.college_id))?.division
    if (fromId) return fromId
  }
  const collegeName = athlete.college?.trim()
  if (!collegeName) return null
  return resolveCollegeByName(collegeName, collegesByName)?.division ?? null
}
