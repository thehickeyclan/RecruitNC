/**
 * Validation report for Fargo connector imports.
 */

import { namesLooselyEqual } from "../normalize"
import type { FargoBoutProposed, FargoProposed } from "../types"

export type FargoValidationReport = {
  imported_athletes: number
  imported_matches: number
  imported_placers: number
  nc_participants: number
  nc_all_americans: number
  nc_champions: number
  nc_finalists: number
  nc_medalists: number
  freestyle_athletes: number
  greco_athletes: number
  matched_athletes: number
  unmatched_athletes: number
  changed_results: number
  conflicts: number
  duplicate_names: string[]
  potential_identity_conflicts: string[]
  warnings: string[]
  by_style: {
    FS: { athletes: number; all_americans: number; champions: number }
    GR: { athletes: number; all_americans: number; champions: number }
  }
}

function isNc(state: string | null | undefined): boolean {
  return (state ?? "").toUpperCase() === "NC"
}

export function buildFargoValidationReport(opts: {
  seasons: FargoProposed[]
  bouts: FargoBoutProposed[]
  /** Unique dual matches (not athlete perspectives) */
  matchCount: number
  placerCount: number
  diffSummary?: { new?: number; match?: number; changed?: number; conflict?: number }
  warnings?: string[]
}): FargoValidationReport {
  const { seasons, bouts, matchCount, placerCount, diffSummary, warnings = [] } = opts

  const nameCounts = new Map<string, number>()
  for (const s of seasons) {
    const k = s.athlete_name.toLowerCase()
    nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1)
  }
  const duplicate_names = [...nameCounts.entries()]
    .filter(([, n]) => n > 1)
    .map(([name]) => name)

  // Same name + different states in same year → potential identity conflict
  const potential_identity_conflicts: string[] = []
  const byNameYear = new Map<string, FargoProposed[]>()
  for (const s of seasons) {
    const k = `${s.year}|${s.athlete_name.toLowerCase()}`
    const list = byNameYear.get(k) ?? []
    list.push(s)
    byNameYear.set(k, list)
  }
  for (const [, list] of byNameYear) {
    const states = new Set(list.map((r) => (r.state ?? "").toUpperCase()).filter(Boolean))
    if (states.size > 1) {
      potential_identity_conflicts.push(
        `${list[0].athlete_name} (${list[0].year}): states ${[...states].join(", ")}`,
      )
    }
  }

  const nc = seasons.filter((s) => isNc(s.state))
  const styleSlice = (style: "FS" | "GR") => {
    const rows = seasons.filter((s) => s.style === style)
    return {
      athletes: rows.length,
      all_americans: rows.filter((s) => s.is_all_american).length,
      champions: rows.filter((s) => s.placement === 1).length,
    }
  }

  // Matched = season rows that already exist as match diffs
  const matched_athletes = diffSummary?.match ?? 0
  const unmatched_athletes = diffSummary?.new ?? seasons.length

  // Bout name collisions across styles same year (OK) vs same natural season key dupes
  for (const s of seasons) {
    for (const o of seasons) {
      if (s === o) continue
      if (
        s.year === o.year &&
        s.style === o.style &&
        s.age_division === o.age_division &&
        s.gender === o.gender &&
        s.weight_class === o.weight_class &&
        namesLooselyEqual(s.athlete_name, o.athlete_name) &&
        (s.state ?? "") !== (o.state ?? "") &&
        s.state &&
        o.state
      ) {
        const msg = `${s.athlete_name} ${s.year} ${s.style} ${s.weight_class}: ${s.state} vs ${o.state}`
        if (!potential_identity_conflicts.includes(msg)) potential_identity_conflicts.push(msg)
      }
    }
  }

  return {
    imported_athletes: seasons.length,
    imported_matches: matchCount,
    imported_placers: placerCount,
    nc_participants: nc.length,
    nc_all_americans: nc.filter((s) => s.is_all_american).length,
    nc_champions: nc.filter((s) => s.placement === 1).length,
    nc_finalists: nc.filter((s) => s.placement === 1 || s.placement === 2).length,
    nc_medalists: nc.filter((s) => s.placement != null && s.placement >= 1 && s.placement <= 3).length,
    freestyle_athletes: seasons.filter((s) => s.style === "FS").length,
    greco_athletes: seasons.filter((s) => s.style === "GR").length,
    matched_athletes,
    unmatched_athletes,
    changed_results: diffSummary?.changed ?? 0,
    conflicts: diffSummary?.conflict ?? 0,
    duplicate_names,
    potential_identity_conflicts,
    warnings,
    by_style: { FS: styleSlice("FS"), GR: styleSlice("GR") },
  }
}

export function formatFargoValidationSummary(report: FargoValidationReport): string {
  return [
    `${report.imported_athletes} athletes · ${report.imported_matches} matches · ${report.imported_placers} placers`,
    `NC: ${report.nc_participants} · AA ${report.nc_all_americans} · champs ${report.nc_champions}`,
    `FS ${report.freestyle_athletes} / GR ${report.greco_athletes}`,
    `New ${report.unmatched_athletes} · Match ${report.matched_athletes} · Changed ${report.changed_results} · Conflicts ${report.conflicts}`,
  ].join(" · ")
}

/** Silence unused if bouts-only callers pass empty seasons. */
export function countUniqueDualMatches(bouts: FargoBoutProposed[]): number {
  const set = new Set<string>()
  for (const b of bouts) {
    if (!b.win) continue
    set.add(
      [
        b.year,
        b.style,
        b.age_division,
        b.gender,
        b.weight_class,
        b.source_match_id ?? `${b.match_order}-${b.athlete_name}-${b.opponent_name}`,
      ].join("|"),
    )
  }
  return set.size
}
