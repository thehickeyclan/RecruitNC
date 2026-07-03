/**
 * Derive "last competed at" weight from tournament rows already loaded for a profile.
 * Display-only — does not write `athletes.weightclass`.
 */

export type LastCompetedWeightCandidate = {
  year: number
  weight: string | number | null | undefined
  event: string
  /** Higher = preferred when years tie (live duals > nationals > Super32 > NCHSAA). */
  priority?: number
}

export type LastCompetedWeight = {
  weight: string
  year: number
  event: string
}

/** Strip "lbs" / non-digits; return numeric class string or null. */
export function normalizeWeightClassLabel(raw: string | number | null | undefined): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/(\d{2,3})/)
  if (!m) return null
  const n = parseInt(m[1]!, 10)
  if (!Number.isFinite(n) || n < 70 || n > 300) return null
  return String(n)
}

/**
 * Pick the most recent tournament weight. Newer year wins; same year uses higher priority.
 */
export function resolveLastCompetedWeight(
  candidates: LastCompetedWeightCandidate[],
): LastCompetedWeight | null {
  const scored: LastCompetedWeight[] = []
  for (const c of candidates) {
    const weight = normalizeWeightClassLabel(c.weight)
    const year = Number(c.year)
    if (!weight || !Number.isFinite(year) || year < 1990 || year > 2040) continue
    const event = (c.event ?? "").trim() || "Tournament"
    scored.push({ weight, year, event })
  }
  if (scored.length === 0) return null

  const withPriority = candidates
    .map((c) => {
      const weight = normalizeWeightClassLabel(c.weight)
      const year = Number(c.year)
      if (!weight || !Number.isFinite(year)) return null
      return {
        weight,
        year,
        event: (c.event ?? "").trim() || "Tournament",
        priority: c.priority ?? 0,
      }
    })
    .filter((x): x is LastCompetedWeight & { priority: number } => x != null)

  withPriority.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.priority - a.priority
  })

  const best = withPriority[0]!
  return { weight: best.weight, year: best.year, event: best.event }
}

export type ProfileWeightDisplay = {
  /** Weight shown as primary on the profile (last competed when known, else listed). */
  displayWeight: string | null
  listedWeight: string | null
  lastCompeted: LastCompetedWeight | null
  /** True when last competed differs from profile-listed weight. */
  differsFromListed: boolean
}

export function buildProfileWeightDisplay(
  listedRaw: string | number | null | undefined,
  lastCompeted: LastCompetedWeight | null,
): ProfileWeightDisplay {
  const listedWeight = normalizeWeightClassLabel(listedRaw)
  const displayWeight = lastCompeted?.weight ?? listedWeight
  const differsFromListed =
    lastCompeted != null &&
    listedWeight != null &&
    lastCompeted.weight !== listedWeight
  return {
    displayWeight,
    listedWeight,
    lastCompeted,
    differsFromListed,
  }
}

/** Build candidates from public profile tournament payload fields. */
export function candidatesFromPublicProfilePayload(athlete: {
  nchsaa_profile?: Array<{ year?: number; weight_class?: string | null }>
  nhsca_results?: Array<{ year?: number; weight?: string | null }>
  super32_results?: Array<{ year?: number; weight?: string | null }>
  national_team_results?: Array<{
    year?: number
    event?: string
    weight?: string | null
  }>
}): LastCompetedWeightCandidate[] {
  const out: LastCompetedWeightCandidate[] = []

  for (const r of athlete.national_team_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: String(r.event ?? "National Team"),
      priority: 40,
    })
  }
  for (const r of athlete.nhsca_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: "NHSCA Nationals",
      priority: 30,
    })
  }
  for (const r of athlete.super32_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: "Super32",
      priority: 20,
    })
  }
  for (const r of athlete.nchsaa_profile ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight_class,
      event: "NCHSAA States",
      priority: 10,
    })
  }

  return out
}
