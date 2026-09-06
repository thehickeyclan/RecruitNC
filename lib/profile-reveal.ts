/**
 * What we already know about a wrestler, shown back to them before they claim a profile.
 *
 * 292 of 421 profiles have no owner — NC United built them because rankings needed them. So
 * for most wrestlers the first screen should not be a form asking for a high school we
 * already have their state placement for. Showing the record first proves the platform is
 * worth their time and earns every answer after it.
 *
 * Competition facts only. This runs *before* ownership is established, so it must never
 * carry anything personal: no cell, no email, no academics. Someone typing a name they do
 * not own learns only what the public profile would already tell them.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

export type RevealCredential = {
  /** Short label for the line: "NCHSAA States", "Super 32 Early Entry". */
  label: string
  /** The achievement itself: "4th · 157", "Champion, 5-0". */
  detail: string
  year: number
  /** Leads the list — a title or a national placement outranks a participation line. */
  weight: number
}

export type ProfileReveal = {
  athleteId: string
  name: string
  photoUrl: string | null
  highSchool: string | null
  club: string | null
  graduationYear: number | null
  /** Published ranking only — an unpublished class number is not ours to show. */
  prospectRanking: number | null
  /** Newest and most impressive first. */
  credentials: RevealCredential[]
  /** True when there is enough here to be worth showing rather than asking. */
  hasRecord: boolean
}

function ordinal(place: number): string {
  const mod = place % 100
  if (mod >= 11 && mod <= 13) return `${place}th`
  if (place % 10 === 1) return `${place}st`
  if (place % 10 === 2) return `${place}nd`
  if (place % 10 === 3) return `${place}rd`
  return `${place}th`
}

/** Placing leads, then a winning record, then having been there at all. */
function placementWeight(place: number | null, record: string | null): number {
  if (place === 1) return 100
  if (place != null && place <= 4) return 90 - place * 5
  if (place != null && place <= 8) return 60
  const wins = Number(String(record ?? "").split("-")[0] ?? 0)
  if (Number.isFinite(wins) && wins > 0) return 30 + Math.min(wins, 8)
  return 10
}

function parsePlace(raw: unknown): number | null {
  const s = String(raw ?? "").trim().toLowerCase()
  if (!s) return null
  if (s.includes("champion")) return 1
  const m = s.match(/(\d+)/)
  if (!m) return null
  const n = Number.parseInt(m[1]!, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Build the reveal from the tournament data already on file.
 *
 * Deliberately skips significant wins: that needs the full ranked-athlete index, which is a
 * paginated scan, and this screen has to feel instant. The headline credentials carry it.
 */
export async function buildProfileReveal(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
): Promise<ProfileReveal> {
  const bundle = await loadAthleteTournamentBundle(supabase, athlete).catch(() => ({
    nchsaa: [],
    nhsca: [],
    super32: [],
    fargo: [],
    other: [],
  }))

  const credentials: RevealCredential[] = []

  for (const r of bundle.nchsaa ?? []) {
    const place = r.place != null && r.place > 0 ? r.place : null
    credentials.push({
      label: "NCHSAA States",
      detail: `${place ? (place === 1 ? "Champion" : ordinal(place)) : "Qualifier"} · ${r.classification} · ${r.weight_class}`,
      year: r.year,
      weight: placementWeight(place, null) + 5, // a state result is the one they will recognise
    })
  }

  const national: Array<[string, Array<{ year: number; placement?: string; record?: string; weight?: string }>]> = [
    ["NHSCA Nationals", bundle.nhsca ?? []],
    ["Super 32", bundle.super32 ?? []],
    ["Fargo Nationals", bundle.fargo ?? []],
  ]
  for (const [label, rows] of national) {
    for (const r of rows) {
      const place = parsePlace(r.placement)
      const detail = [
        place ? (place === 1 ? "Champion" : ordinal(place)) : "",
        r.record ? `${r.record}` : "",
        r.weight ?? "",
      ]
        .filter(Boolean)
        .join(" · ")
      if (!detail) continue
      credentials.push({ label, detail, year: r.year, weight: placementWeight(place, r.record ?? null) })
    }
  }

  for (const r of bundle.other ?? []) {
    const detail = [
      r.placement ? (r.placement === 1 ? "Champion" : ordinal(r.placement)) : "",
      r.record,
      r.weight,
      r.qualified ? "Super 32 qualifier" : "",
    ]
      .filter(Boolean)
      .join(" · ")
    credentials.push({
      label: r.eventShortName,
      detail,
      year: r.year,
      weight: placementWeight(r.placement, r.record),
    })
  }

  credentials.sort((a, b) => b.year - a.year || b.weight - a.weight)

  const graduationYear = athlete.graduationyear == null ? null : Number(athlete.graduationyear)
  const rawRank = athlete.prospect_ranking == null ? null : Number(athlete.prospect_ranking)
  const published =
    rawRank != null &&
    Number.isFinite(rawRank) &&
    rawRank >= 1 &&
    isPublicRankingsYearPublished(graduationYear) &&
    rawRank <= getPublicRankingsMax(graduationYear)

  const photo = String(athlete.photourl ?? athlete.photo_url ?? athlete.image_url ?? "").trim()

  return {
    athleteId: String(athlete.id),
    name: String(athlete.name ?? "Athlete"),
    photoUrl: photo && photo !== "/wrestler-silhouette.png" ? photo : null,
    highSchool: String(athlete.highschool ?? "").trim() || null,
    club: String(athlete.wrestlingClub ?? "").trim() || null,
    graduationYear,
    prospectRanking: published ? rawRank : null,
    credentials: credentials.slice(0, 6),
    hasRecord: credentials.length > 0 || published,
  }
}

/**
 * The gaps worth asking about, in the order college coaches ask for them.
 *
 * Only fields the wrestler can supply. Results are ours to fill and never appear here — the
 * point of the reveal is that they do not have to type those in.
 */
export type ProfileGap = { field: string; label: string; why: string }

export function profileGaps(athlete: Record<string, unknown>): ProfileGap[] {
  const missing: ProfileGap[] = []
  const has = (v: unknown) => String(v ?? "").trim().length > 0

  if (!has(athlete.highlight_video_url)) {
    missing.push({
      field: "highlight_video_url",
      label: "Highlight film",
      why: "The first thing a college coach asks for after your record.",
    })
  }
  if (athlete.academic_gpa == null) {
    missing.push({
      field: "academic_gpa",
      label: "GPA",
      why: "Coaches check whether you are admissible before anything else.",
    })
  }
  if (!has(athlete.academic_interest)) {
    missing.push({
      field: "academic_interest",
      label: "Intended major",
      why: "Lets a coach match you to what their school actually offers.",
    })
  }
  if (!has(athlete.photourl) && !has(athlete.photo_url)) {
    missing.push({ field: "photourl", label: "Photo", why: "Your report leads with it." })
  }
  return missing
}
