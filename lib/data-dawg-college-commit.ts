/**
 * Resolve college commitment for Data Dawg athlete summaries.
 * Prefer athletes.college; fall back to wrestling_commits (incl. Eli/Elijah name variants).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getAthleteNameSearchVariants } from "@/lib/athlete-name-match"
import { escapeForIlike } from "@/lib/nchsaa-results"

export type AthleteCollegeCommit = {
  college: string
  division: string | null
  previousCollege: string | null
  source: "athletes" | "wrestling_commits"
}

function collegeWithDivision(college: string, division?: string | null): string {
  const c = college.trim()
  const div = (division ?? "").trim()
  if (!div || c.toLowerCase().includes(div.toLowerCase())) return c
  return `${c} (${div})`
}

/**
 * Chronological college path: original school first when there was a transfer.
 * `college` = current school; `previousCollege` = where they first committed.
 */
export function formatCommitChronologyLine(
  college: string,
  previousCollege?: string | null,
  division?: string | null,
): string {
  const current = collegeWithDivision(college, division)
  const prev = String(previousCollege ?? "").trim()
  if (prev && prev.toLowerCase() !== college.trim().toLowerCase()) {
    return `College career: ${prev} → ${current}`
  }
  return `College: ${current}`
}

/** Clause for analyst lead / closer (no leading capital required). */
export function formatCommitNarrativeClause(
  college: string,
  previousCollege?: string | null,
  division?: string | null,
): string {
  const current = collegeWithDivision(college, division)
  const prev = String(previousCollege ?? "").trim()
  if (prev && prev.toLowerCase() !== college.trim().toLowerCase()) {
    return `continued his career collegiately at ${prev} and then ${current}`
  }
  return `committed to ${current}`
}

/** Timeline label — progression first when a transfer exists. */
export function formatCommitTimelineLabel(
  college: string,
  previousCollege?: string | null,
  division?: string | null,
): string {
  const current = collegeWithDivision(college, division)
  const prev = String(previousCollege ?? "").trim()
  if (prev && prev.toLowerCase() !== college.trim().toLowerCase()) {
    return `🎓 ${prev} → ${current}`
  }
  return `🎓 ${current}`
}

export async function resolveAthleteCollegeCommit(
  admin: SupabaseClient,
  opts: {
    displayName: string
    college?: string | null
    division?: string | null
    previousCollege?: string | null
  },
): Promise<AthleteCollegeCommit | null> {
  const fromRow = String(opts.college ?? "").trim()
  const previousCollege = String(opts.previousCollege ?? "").trim() || null
  if (fromRow) {
    return {
      college: fromRow,
      division: String(opts.division ?? "").trim() || null,
      previousCollege,
      source: "athletes",
    }
  }

  const variants = getAthleteNameSearchVariants(opts.displayName)
    .map((v) => v.trim())
    .filter((v) => v.length >= 3)
    .slice(0, 8)
  if (variants.length === 0) return null

  const orParts = variants.map((v) => `athlete_name.ilike.%${escapeForIlike(v)}%`).join(",")
  const { data, error } = await admin
    .from("wrestling_commits")
    .select("athlete_name, college, level, notes")
    .or(orParts)
    .limit(20)

  if (error || !data?.length) return null

  const nameLow = opts.displayName.trim().toLowerCase()
  const variantLows = new Set(variants.map((v) => v.toLowerCase()))

  const ranked = [...data]
    .filter((r) => String(r.college ?? "").trim())
    .sort((a, b) => {
      const aN = String(a.athlete_name ?? "").trim().toLowerCase()
      const bN = String(b.athlete_name ?? "").trim().toLowerCase()
      const aExact = aN === nameLow || variantLows.has(aN) ? 0 : 1
      const bExact = bN === nameLow || variantLows.has(bN) ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      return aN.length - bN.length
    })

  const best = ranked[0]
  if (!best) return null
  const college = String(best.college ?? "").trim()
  if (!college) return null

  // Parse "Transferred from X" from notes when athletes.previous_college is unset.
  let fromNotes: string | null = previousCollege
  if (!fromNotes) {
    const notes = String(best.notes ?? "")
    const m = notes.match(/transferred from\s+(.+?)(?:\s+to\s+|\.|$)/i)
    if (m?.[1]) fromNotes = m[1].trim() || null
  }

  return {
    college,
    division: String(best.level ?? "").trim() || null,
    previousCollege: fromNotes,
    source: "wrestling_commits",
  }
}
