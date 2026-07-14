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
  source: "athletes" | "wrestling_commits"
}

export async function resolveAthleteCollegeCommit(
  admin: SupabaseClient,
  opts: {
    displayName: string
    college?: string | null
    division?: string | null
  },
): Promise<AthleteCollegeCommit | null> {
  const fromRow = String(opts.college ?? "").trim()
  if (fromRow) {
    return {
      college: fromRow,
      division: String(opts.division ?? "").trim() || null,
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
    .select("athlete_name, college, level")
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
  return {
    college,
    division: String(best.level ?? "").trim() || null,
    source: "wrestling_commits",
  }
}
