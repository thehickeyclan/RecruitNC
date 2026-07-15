/**
 * Canonical NC NHSCA All-Americans by year (page / verified yearly roster).
 * School leaderboards and dossiers merge these so counts stay correct even when
 * `nhsca_placements.high_school` is still null after import.
 *
 * Annual workflow — add next year:
 * 1. Put verified AA rows (with high_school) in JSON (page replica or lib/data/nhsca-aa/YYYY.json).
 * 2. Register the year in NHSCA_CANONICAL_AA_LOADERS below.
 * 3. Deploy. Leaderboard/dossier pick it up automatically.
 * 4. Optional: Admin → NHSCA Placements → “Sync schools from yearly AA files” to write DB.
 */

import nhsca2026 from "@/lib/data/nhsca-2026-replica-page.json"

export type CanonicalNhscaAa = {
  year: number
  athlete_name: string
  placement: number
  division: string
  weight: string
  high_school: string
  state?: string
}

type Loader = { year: number; load: () => CanonicalNhscaAa[] }

function fromSection1(
  year: number,
  rows: Array<{
    athlete_name: string
    year?: number
    division: string
    weight: string
    placement: number
    high_school?: string | null
    state?: string | null
  }>,
): CanonicalNhscaAa[] {
  const out: CanonicalNhscaAa[] = []
  for (const r of rows) {
    const hs = String(r.high_school ?? "").trim()
    if (!hs) continue
    const placement = Number(r.placement)
    if (!Number.isFinite(placement) || placement < 1 || placement > 8) continue
    const name = String(r.athlete_name ?? "").trim()
    if (!name) continue
    out.push({
      year: Number(r.year) || year,
      athlete_name: name,
      placement,
      division: String(r.division ?? "").trim(),
      weight: String(r.weight ?? "").trim(),
      high_school: hs,
      state: r.state ? String(r.state) : "NC",
    })
  }
  return out
}

/**
 * Register each tournament year here when the AA roster is added to the repo.
 * Do not hard-code year filters in the school leaderboard.
 */
export const NHSCA_CANONICAL_AA_LOADERS: Loader[] = [
  {
    year: 2026,
    load: () =>
      fromSection1(
        2026,
        (nhsca2026 as { section1_all_americans: Parameters<typeof fromSection1>[1] })
          .section1_all_americans,
      ),
  },
]

export function listCanonicalNhscaAaYears(): number[] {
  return NHSCA_CANONICAL_AA_LOADERS.map((l) => l.year).sort((a, b) => a - b)
}

export function getAllCanonicalNhscaAllAmericans(): CanonicalNhscaAa[] {
  const out: CanonicalNhscaAa[] = []
  for (const loader of NHSCA_CANONICAL_AA_LOADERS) {
    out.push(...loader.load())
  }
  return out
}

export function getCanonicalNhscaAllAmericansForYear(year: number): CanonicalNhscaAa[] {
  const loader = NHSCA_CANONICAL_AA_LOADERS.find((l) => l.year === year)
  return loader ? loader.load() : []
}

function strField(v: unknown): string {
  return v == null ? "" : String(v).trim()
}

function aaIdentityKey(r: {
  athlete_name?: string | null
  year?: number | null
  placement?: number | null
  division?: string | null
}): string {
  return [
    strField(r.athlete_name).toLowerCase().replace(/\s+/g, " "),
    String(r.year ?? ""),
    String(r.placement ?? ""),
    strField(r.division).toLowerCase(),
  ].join("|")
}

/**
 * Merge all registered yearly AA rosters into DB/query rows.
 * Drops empty-school shells for registered years; injects canonical schools.
 */
export function mergeCanonicalNhscaAaIntoLeaderboardRows<
  T extends {
    athlete_name?: string | null
    year?: number | null
    placement?: number | null
    high_school?: string | null
    weight_class?: string | null
    weight?: string | null
    division?: string | null
  },
>(rows: T[]): T[] {
  const registeredYears = new Set(listCanonicalNhscaAaYears())
  const byKey = new Map<string, T>()

  for (const r of rows) {
    const y = Number(r.year)
    if (
      registeredYears.has(y) &&
      r.placement != null &&
      Number(r.placement) >= 1 &&
      Number(r.placement) <= 8 &&
      !strField(r.high_school)
    ) {
      continue
    }
    byKey.set(aaIdentityKey(r), r)
  }

  for (const c of getAllCanonicalNhscaAllAmericans()) {
    const k = aaIdentityKey(c)
    const existing = byKey.get(k)
    if (existing && strField(existing.high_school)) {
      continue
    }
    byKey.set(k, {
      ...(existing as object),
      athlete_name: c.athlete_name,
      year: c.year,
      placement: c.placement,
      high_school: c.high_school,
      weight_class: c.weight,
      weight: c.weight,
      division: c.division,
    } as T)
  }

  return [...byKey.values()]
}
