/**
 * Derive "last competed at" weight from tournament rows already loaded for a profile.
 * Display-only — does not write `athletes.weightclass`.
 */

export type LastCompetedWeightCandidate = {
  year: number
  weight: string | number | null | undefined
  event: string
  /**
   * The day it was wrestled, when the source records one. Most result tables carry only a
   * year, so this stays null for them rather than inventing a January the 1st.
   */
  date?: string | null
  /** Higher = preferred when years tie (live duals > nationals > Super32 > NCHSAA). */
  priority?: number
  /**
   * The month an annual event is always held in, 1-12, where the source records no day.
   *
   * Fargo is mid-July and the Tar Heel State Classic was mid-April, both in 2026, and Brianna
   * Palmer's profile said she last competed at the Tar Heel - because the qualifier priority
   * outranks Fargo's and the date test only fires when both sides carry a real day. A month is
   * not a date and is not displayed; it only orders two events inside the same year.
   */
  month?: number
}

export type LastCompetedWeight = {
  weight: string
  year: number
  event: string
  /** Null when the source records only a year — see `LastCompetedWeightCandidate.date`. */
  date: string | null
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
    scored.push({ weight, year, event, date: c.date ?? null })
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
        date: c.date ?? null,
        priority: c.priority ?? 0,
        month: c.month ?? null,
      }
    })
    .filter((x): x is LastCompetedWeight & { priority: number; month: number | null } => x != null)

  /*
   * A real date beats the priority table.
   *
   * Ordering was year, then a hard-coded ranking of event types, which gets two events in the
   * same season the wrong way round whenever the calendar disagrees with the ranking — the
   * Tournament of Champions in September against a Super 32 the week before, say. Where both
   * candidates record an actual day, that decides it; the priority order still settles the
   * annual events that carry only a year.
   */
  // A real day where we have one, else the month the event is always held in, else the ranking.
  const monthOf = (x: { date: string | null; month: number | null }) => {
    const parsed = x.date ? Date.parse(x.date) : NaN
    return Number.isFinite(parsed) ? new Date(parsed).getUTCMonth() + 1 : x.month
  }
  withPriority.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    const aDate = a.date ? Date.parse(a.date) : NaN
    const bDate = b.date ? Date.parse(b.date) : NaN
    if (Number.isFinite(aDate) && Number.isFinite(bDate) && aDate !== bDate) return bDate - aDate
    const aMonth = monthOf(a)
    const bMonth = monthOf(b)
    if (aMonth != null && bMonth != null && aMonth !== bMonth) return bMonth - aMonth
    return b.priority - a.priority
  })

  const best = withPriority[0]!
  return { weight: best.weight, year: best.year, event: best.event, date: best.date ?? null }
}

export type ProfileWeightDisplay = {
  /**
   * Weight shown as primary on the profile: the athlete's own listed weight, falling back to
   * last competed only when they haven't set one. The profile value leads because it's what
   * the athlete maintains — it's their current/target weight, while last-competed is history
   * and can be a year stale. Last competed is shown beneath it for context.
   */
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
  const displayWeight = listedWeight ?? lastCompeted?.weight ?? null
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
  other_tournament_results?: Array<{
    year?: number
    weight?: string | null
    eventShortName?: string
    eventDate?: string | null
  }>
  nhsca_results?: Array<{ year?: number; weight?: string | null }>
  super32_results?: Array<{ year?: number; weight?: string | null }>
  fargo_results?: Array<{ year?: number; weight?: string | null }>
  national_team_results?: Array<{
    year?: number
    event?: string
    weight?: string | null
  }>
}): LastCompetedWeightCandidate[] {
  const out: LastCompetedWeightCandidate[] = []

  // Qualifiers and open events run in the early season, so within a year they are usually
  // the most recent thing the athlete wrestled — they lead the priority order.
  for (const r of athlete.other_tournament_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: String(r.eventShortName || "Tournament"),
      date: r.eventDate ?? null,
      priority: 50,
    })
  }
  for (const r of athlete.national_team_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: String(r.event ?? "National Team"),
      priority: 40,
    })
  }
  for (const r of athlete.fargo_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: "Fargo",
      priority: 35,
      month: 7,
    })
  }
  for (const r of athlete.nhsca_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: "NHSCA Nationals",
      priority: 30,
      month: 3,
    })
  }
  for (const r of athlete.super32_results ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight,
      event: "Super32",
      priority: 20,
      month: 10,
    })
  }
  for (const r of athlete.nchsaa_profile ?? []) {
    out.push({
      year: Number(r.year),
      weight: r.weight_class,
      event: "NCHSAA States",
      priority: 10,
      month: 2,
    })
  }

  return out
}
