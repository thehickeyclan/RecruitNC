import type { SupabaseClient } from "@supabase/supabase-js"
import { getWrestlerRecords } from "@/lib/nhsca-duals-command-center"
import { fetchNhscaDualsSnapshot } from "@/lib/nhsca-duals-live-results/db"
import type { NhscaDualsResultsSnapshot, NhscaDualsWrestlerRecord } from "@/lib/nhsca-duals-live-results/types"
import { namesMatchRoster } from "@/lib/nhsca-duals-wrestler-card-stats"
import { getNameVariants } from "@/lib/tournament-tables"
import type { NationalTeamResultRow } from "@/lib/tournament-utils"

export type ProfileNationalTeamResult = NationalTeamResultRow & { isPlaceholder?: boolean }

export const NHSCA_DUALS_2026_YEAR = 2026
export const NHSCA_DUALS_NATIONAL_EVENT_LABEL = "NHSCA Duals"
export const NHSCA_DUALS_SELECT_EVENT_LABEL = "NHSCA Duals (Select)"

const NHSCA_DUALS_2026_NATIONAL_SLUG = "nhsca-duals-2026"
const NHSCA_DUALS_2026_SELECT_SLUG = "nhsca-duals-2026-select"
const NHSCA_DUALS_2026_SLUGS = [NHSCA_DUALS_2026_NATIONAL_SLUG, NHSCA_DUALS_2026_SELECT_SLUG] as const

function eventLabelForSlug(slug: (typeof NHSCA_DUALS_2026_SLUGS)[number]): string {
  return slug === NHSCA_DUALS_2026_SELECT_SLUG
    ? NHSCA_DUALS_SELECT_EVENT_LABEL
    : NHSCA_DUALS_NATIONAL_EVENT_LABEL
}

function resultKey(r: NationalTeamResultRow): string {
  return `${r.event}|${r.year}`
}

function isRealRecord(r: ProfileNationalTeamResult): boolean {
  if (r.isPlaceholder) return false
  const rec = (r.record ?? "").trim()
  return rec !== "" && rec !== "0-0"
}

/** Match athlete name variants to a live duals wrestler record (national or select roster). */
export function matchWrestlerRecordForProfile(
  nameBases: string[],
  records: NhscaDualsWrestlerRecord[]
): NhscaDualsWrestlerRecord | null {
  for (const base of nameBases) {
    const trimmed = base.trim()
    if (!trimmed) continue
    const matches = records.filter((r) => namesMatchRoster(trimmed, r.name))
    if (matches.length === 1) return matches[0]!
    if (matches.length > 1) {
      const withBouts = matches.filter((r) => r.wins + r.losses > 0)
      if (withBouts.length === 1) return withBouts[0]!
      return matches[0]!
    }
  }
  return null
}

/** Build NHSCA Duals 2026 rows from live match snapshot (National + Select when matched). */
export function buildNhscaDuals2026LiveProfileResults(
  snapshot: NhscaDualsResultsSnapshot,
  nameBases: string[]
): ProfileNationalTeamResult[] {
  const rows: ProfileNationalTeamResult[] = []

  for (const teamType of ["national", "select"] as const) {
    const records = getWrestlerRecords(snapshot, teamType)
    const matched = matchWrestlerRecordForProfile(nameBases, records)
    if (!matched) continue

    const bouts = matched.wins + matched.losses
    rows.push({
      event: teamType === "select" ? NHSCA_DUALS_SELECT_EVENT_LABEL : NHSCA_DUALS_NATIONAL_EVENT_LABEL,
      year: NHSCA_DUALS_2026_YEAR,
      record: `${matched.wins}-${matched.losses}`,
      isPlaceholder: bouts === 0,
    })
  }

  return rows
}

export async function getNhscaDuals2026LiveProfileResults(
  supabase: SupabaseClient,
  nameBases: string[]
): Promise<ProfileNationalTeamResult[]> {
  try {
    const snap = await fetchNhscaDualsSnapshot(supabase)
    if (!snap.ok || snap.data.teams.length === 0) return []
    return buildNhscaDuals2026LiveProfileResults(snap.data, nameBases)
  } catch {
    return []
  }
}

async function registrationStatusForSlug(
  supabase: SupabaseClient,
  eventSlug: string,
  athleteId: string,
  athlete: { name: string; highSchool: string; gradYear: number }
): Promise<{ member: boolean; record: string }> {
  try {
    const { data: byId, error } = await supabase
      .from("national_team_event_registrations")
      .select("id, record")
      .eq("event_slug", eventSlug)
      .eq("status", "paid")
      .eq("athlete_id", athleteId)
      .limit(1)
    if (!error && byId && byId.length > 0) {
      const r = byId[0] as { record?: string }
      return { member: true, record: (r.record ?? "").trim() || "0-0" }
    }
  } catch {
    // athlete_id or record column may not exist yet; fall back to name match
  }

  const nameVariants = new Set(getNameVariants(athlete.name).map((n) => n.trim().toLowerCase()))
  const gradStr = String(athlete.gradYear)
  const highNorm = (athlete.highSchool ?? "").trim().toLowerCase()

  const { data: rows } = await supabase
    .from("national_team_event_registrations")
    .select("athlete_first_name, athlete_last_name, high_school, graduation_year, record")
    .eq("event_slug", eventSlug)
    .eq("status", "paid")
    .eq("graduation_year", gradStr)

  if (!rows?.length) return { member: false, record: "0-0" }

  for (const r of rows as {
    athlete_first_name?: string
    athlete_last_name?: string
    high_school?: string
    graduation_year?: string
    record?: string
  }[]) {
    const regFull = [r.athlete_first_name, r.athlete_last_name].filter(Boolean).join(" ").trim().toLowerCase()
    if (!regFull) continue
    const regGrad = (r.graduation_year ?? "").toString().trim()
    const regSchool = (r.high_school ?? "").trim().toLowerCase()
    if (nameVariants.has(regFull) && regGrad === gradStr && (!highNorm || regSchool === highNorm)) {
      return { member: true, record: (r.record ?? "").trim() || "0-0" }
    }
  }

  return { member: false, record: "0-0" }
}

/** Paid registration placeholders when live results are not available yet. */
export async function getNhscaDuals2026RegistrationPlaceholders(
  supabase: SupabaseClient,
  athleteId: string,
  athlete: { name: string; highSchool: string; gradYear: number }
): Promise<ProfileNationalTeamResult[]> {
  const rows: ProfileNationalTeamResult[] = []

  for (const slug of NHSCA_DUALS_2026_SLUGS) {
    const status = await registrationStatusForSlug(supabase, slug, athleteId, athlete)
    if (!status.member) continue
    const record = status.record || "0-0"
    rows.push({
      event: eventLabelForSlug(slug),
      year: NHSCA_DUALS_2026_YEAR,
      record,
      isPlaceholder: !record || record === "0-0",
    })
  }

  return rows
}

/**
 * Merge NC United profile rows: live dual results override stale placeholders;
 * table/historical data fills gaps when live has not scored bouts yet.
 */
export function mergeNationalTeamResultsForProfile(parts: {
  fromTable: ProfileNationalTeamResult[]
  fromAthleteRow: ProfileNationalTeamResult[]
  fromLive: ProfileNationalTeamResult[]
  fromRegistration: ProfileNationalTeamResult[]
}): ProfileNationalTeamResult[] {
  const byKey = new Map<string, ProfileNationalTeamResult>()

  for (const r of parts.fromAthleteRow) {
    if (!byKey.has(resultKey(r))) byKey.set(resultKey(r), r)
  }
  for (const r of parts.fromTable) {
    byKey.set(resultKey(r), r)
  }
  for (const r of parts.fromRegistration) {
    const k = resultKey(r)
    if (!byKey.has(k)) byKey.set(k, r)
  }
  for (const r of parts.fromLive) {
    const k = resultKey(r)
    const prev = byKey.get(k)
    if (!prev) {
      byKey.set(k, r)
      continue
    }
    if (isRealRecord(r)) {
      byKey.set(k, { ...r, isPlaceholder: false })
      continue
    }
    if (!isRealRecord(prev)) byKey.set(k, r)
  }

  const liveNational2026 = parts.fromLive.find(
    (r) => r.event === NHSCA_DUALS_NATIONAL_EVENT_LABEL && r.year === NHSCA_DUALS_2026_YEAR && isRealRecord(r)
  )
  if (liveNational2026) {
    byKey.delete(`NHSCA National Duals|${NHSCA_DUALS_2026_YEAR}`)
  }

  return [...byKey.values()].sort((a, b) => b.year - a.year)
}
