import {
  canonicalizeWrestlerName,
  classificationNaturalKey,
  classificationSchoolsEqual,
  dualNaturalKey,
  namesLooselyEqual,
  placerNaturalKey,
  schoolsLooselyEqual,
  uniqueClassificationLastTokens,
} from "./normalize"
import type {
  ClassificationProposed,
  DiffStatus,
  DualTeamProposed,
  PlacerProposed,
  StagedDiffRow,
} from "./types"
import { DATASET_CLASSIFICATIONS, DATASET_DUAL_TEAM, DATASET_PLACERS } from "./types"

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

/** DB has no gender column — slot is year|class|weight|place; identity is athlete name. */
function placerSlotKey(
  year: number,
  classification: string,
  weightClass: string,
  place: number,
): string {
  return placerNaturalKey(year, classification, weightClass, place, null)
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
  const bySlot = new Map<string, Array<Record<string, unknown>>>()
  for (const r of existingRows) {
    const year = Number(r.year)
    const classification = String(r.classification ?? "")
    const weight = String(r.weight_class ?? "")
    const place = Number(r.place)
    if (!Number.isFinite(year) || !classification || !weight || !Number.isFinite(place)) continue
    const slot = placerSlotKey(year, classification, weight, place)
    const list = bySlot.get(slot) ?? []
    list.push(r)
    bySlot.set(slot, list)
  }

  const out: StagedDiffRow[] = []
  for (const raw of proposed) {
    const p: PlacerProposed = {
      ...raw,
      wrestler_name: canonicalizeWrestlerName(raw.wrestler_name),
    }
    const natural_key = placerNaturalKey(
      p.year,
      p.classification,
      p.weight_class,
      p.place,
      p.gender,
    )
    const slot = placerSlotKey(p.year, p.classification, p.weight_class, p.place)
    const candidates = bySlot.get(slot) ?? []
    const existingRow =
      candidates.find((r) => namesLooselyEqual(p.wrestler_name, r.wrestler_name)) ?? null

    let diff_status: DiffStatus
    if (!existingRow) {
      // Table allows multiple athletes in the same class/weight/place (men + women).
      // Insert — do not treat a different name in the slot as an overwrite.
      diff_status = "new"
    } else if (placerEqual(p, existingRow)) {
      diff_status = "match"
    } else if (namesLooselyEqual(p.wrestler_name, existingRow.wrestler_name)) {
      diff_status = schoolsLooselyEqual(p.school, existingRow.school) ? "match" : "changed"
    } else {
      diff_status = "changed"
    }

    out.push({
      dataset_key: DATASET_PLACERS,
      natural_key,
      diff_status,
      proposed: p,
      existing: existingRow,
    })
  }
  return out
}

function classificationEqual(a: ClassificationProposed, b: Record<string, unknown>): boolean {
  const existingClass = String(b.classification ?? "")
    .replace(/\s+/g, "")
    .toUpperCase()
  const proposedClass = a.classification.replace(/\s+/g, "").toUpperCase()
  if (proposedClass !== existingClass) return false
  // Region / conference optional — only compare when both sides have values
  if (a.region != null && b.region != null && String(a.region).trim() !== String(b.region).trim()) {
    return false
  }
  if (
    a.conference != null &&
    b.conference != null &&
    String(a.conference).trim() !== String(b.conference).trim()
  ) {
    return false
  }
  return true
}

export function diffClassificationRows(
  proposed: ClassificationProposed[],
  existingRows: Array<Record<string, unknown>>,
): StagedDiffRow[] {
  const uniqueLast = uniqueClassificationLastTokens([
    ...proposed.map((p) => p.school_name),
    ...existingRows.map((r) => String(r.school_name ?? "")),
  ])

  const findExisting = (school: string): Record<string, unknown> | null => {
    for (const r of existingRows) {
      if (classificationSchoolsEqual(school, r.school_name, uniqueLast)) return r
    }
    return null
  }

  const out: StagedDiffRow[] = []
  for (const p of proposed) {
    const existing = findExisting(p.school_name)
    let diff_status: DiffStatus
    if (!existing) diff_status = "new"
    else if (classificationEqual(p, existing)) diff_status = "match"
    else diff_status = "changed"
    out.push({
      dataset_key: DATASET_CLASSIFICATIONS,
      natural_key: classificationNaturalKey(p.effective_year, p.school_name),
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
