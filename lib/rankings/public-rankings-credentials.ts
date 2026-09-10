import "server-only"

import { unstable_cache } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteCredentialsBatch } from "@/lib/credentials/athlete-credentials"
import { getPublicRankingsMax } from "@/lib/public-rankings-cap"

/**
 * Credentials for a published class ranking — the one endpoint the phone app may ask.
 *
 * The app lives in another repo with only the anon key, and there was nothing it could call:
 * `/api/rankings` reads a different source and `/api/public-rankings` requires a session. So it
 * wrote its own All-American lookup against `nhsca_placements` keyed on `athlete_id`, which is
 * the query that silently drops the 60-odd rows that were never linked. Four of the nine
 * All-Americans in the Class of 2028 were missing from the phone and present on the web.
 *
 * This exists so that stops being possible: one engine, one answer, and the app renders it rather
 * than deriving it. What it returns is exactly what the public rankings page already shows —
 * published classes only, capped at the published top thirty — so it discloses nothing new.
 *
 * It is deliberately keyed by class year and not by athlete id. An id-addressable credentials
 * endpoint would be an enumeration surface over the whole athlete table, and the Tournament of
 * Champions drip release depends on unannounced athletes being unreachable.
 */

export type PublicCredentialsResponse = {
  year: number
  athletes: Array<{
    athleteId: string
    rank: number
    /** Null when the wrestler holds none. */
    allAmerican: { honors: number; year: number; event: "NHSCA" | "Super 32" | "Fargo"; label: string } | null
    stateTitles: number
    statePlacements: number
  }>
}

async function buildCredentialsForYear(year: number): Promise<PublicCredentialsResponse> {
  const cap = getPublicRankingsMax(year)
  const admin = createAdminClient()

  /*
   * An allowlist, not `select("*")`. The matcher needs identity columns, and this table also
   * carries GPA, contact details and staff evaluation notes on the same row.
   */
  const { data: rows } = await admin
    .from("athletes")
    .select(
      [
        "id, name, highschool, graduationyear, prospect_ranking",
        "wrestling_name",
        '"firstName"',
        '"lastName"',
        "nhsca_results",
        "super32_results",
      ].join(", "),
    )
    .eq("graduationyear", year)
    .eq("is_nc_athlete", true)
    .not("prospect_ranking", "is", null)
    .lte("prospect_ranking", cap)
    .order("prospect_ranking", { ascending: true })

  const list = (rows ?? []) as unknown as Array<Record<string, unknown>>
  const credentials = await loadAthleteCredentialsBatch(admin, list)

  return {
    year,
    athletes: list.map((raw) => {
      const held = credentials.get(String(raw.id))
      const newest = held?.allAmerican[0] ?? null
      const honors = held?.allAmerican.length ?? 0
      return {
        athleteId: String(raw.id),
        rank: Number(raw.prospect_ranking),
        allAmerican: newest
          ? {
              honors,
              year: newest.year,
              event: newest.event,
              // The phone renders this verbatim, so the wording lives here and not in two repos.
              label: honors > 1 ? `${honors}x All-American` : `${newest.year} ${newest.event} All-American`,
            }
          : null,
        stateTitles: held?.state.filter((s) => s.place === 1).length ?? 0,
        statePlacements: held?.state.filter((s) => s.place != null && s.place > 1 && s.place <= 8).length ?? 0,
      }
    }),
  }
}

export const loadCredentialsForYear = unstable_cache(buildCredentialsForYear, ["public-rankings-credentials", "v1"], {
  revalidate: 3600,
  tags: ["public-rankings"],
})

