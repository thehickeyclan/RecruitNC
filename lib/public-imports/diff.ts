import {
  dualNaturalKey,
  namesLooselyEqual,
  placerNaturalKey,
  schoolsLooselyEqual,
} from "./normalize"
import type {
  DiffStatus,
  DualTeamProposed,
  PlacerProposed,
  StagedDiffRow,
} from "./types"
import { DATASET_DUAL_TEAM, DATASET_PLACERS } from "./types"

function dualEqual(a: DualTeamProposed, b: Record<string, unknown>): boolean {
  return (
    schoolsLooselyEqual(a.champion_school, b.champion_school) &&
    schoolsLooselyEqual(a.runner_up_school ?? "", b.runner_up_school ?? "") &&
    Boolean(a.is_vacated) === Boolean(b.is_vacated) &&
    (a.held == null || b.held == null || Boolean(a.held) === Boolean(b.held))
  )
}

function placerEqual(a: PlacerProposed, b: Record<string, unknown>): boolean {
  return (
    namesLooselyEqual(a.wrestler_name, b.wrestler_name) &&
    schoolsLooselyEqual(a.school, b.school)
  )
}

export function diffDualTeamRows(
  proposed: DualTeamProposed[],
  existingRows: Array<Record<string, unknown>>,
): StagedDiffRow[] {
  const byKey = new Map<string, Record<string, unknown>>()
  for (const r of existingRows) {
    const year = Number(r.year)
    const division = String(r.division ?? "")
    if (!Number.isFinite(year) || !division) continue
    byKey.set(dualNaturalKey(year, division), r)
  }

  const out: StagedDiffRow[] = []
  for (const p of proposed) {
    const key = dualNaturalKey(p.year, p.division)
    const existing = byKey.get(key) ?? null
    let diff_status: DiffStatus
    if (!existing) diff_status = "new"
    else if (dualEqual(p, existing)) diff_status = "match"
    else diff_status = "changed"
    out.push({
      dataset_key: DATASET_DUAL_TEAM,
      natural_key: key,
      diff_status,
      proposed: p,
      existing,
    })
  }
  return out
}

export function diffPlacerRows(
  proposed: PlacerProposed[],
  existingRows: Array<Record<string, unknown>>,
): StagedDiffRow[] {
  const byKey = new Map<string, Record<string, unknown>>()
  for (const r of existingRows) {
    const year = Number(r.year)
    const classification = String(r.classification ?? "")
    const weight = String(r.weight_class ?? "")
    const place = Number(r.place)
    if (!Number.isFinite(year) || !classification || !weight || !Number.isFinite(place)) continue
    byKey.set(placerNaturalKey(year, classification, weight, place), r)
  }

  const out: StagedDiffRow[] = []
  for (const p of proposed) {
    const key = placerNaturalKey(p.year, p.classification, p.weight_class, p.place)
    const existing = byKey.get(key) ?? null
    let diff_status: DiffStatus
    if (!existing) diff_status = "new"
    else if (placerEqual(p, existing)) diff_status = "match"
    else diff_status = "changed"
    out.push({
      dataset_key: DATASET_PLACERS,
      natural_key: key,
      diff_status,
      proposed: p,
      existing,
    })
  }
  return out
}

export function summarizeDiffs(rows: StagedDiffRow[]) {
  const summary = { total: rows.length, new: 0, match: 0, changed: 0, conflict: 0 }
  for (const r of rows) summary[r.diff_status] += 1
  return summary
}
