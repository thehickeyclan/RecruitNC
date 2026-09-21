import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { buildProfileReveal } from "@/lib/profile-reveal"
import {
  buildTournamentRows,
  isTocRow,
  type AccordionSummaryResult,
  type NationalTeamEntry,
  type TournamentRow,
} from "@/lib/profile/tournament-rows"

/**
 * A wrestler's profile, for the phone.
 *
 * Deliberately not `/api/athlete/[id]`: that one answers with the whole athletes row, which is a
 * hundred columns wide and carries a cell number, a contact email, a GPA and a date of birth.
 * The web profile renders none of those to a stranger — the filtering happens in the React
 * component — so the leak is invisible until something else consumes the route. A phone is
 * something else consuming the route.
 *
 * So this projects onto a list of fields written out by hand. Anything not named here cannot
 * reach a device, including a column somebody adds to `athletes` next month. These are minors:
 * the safe default is a payload that has to be extended on purpose.
 *
 * Open, like the field and rankings routes the app already calls — it returns what the public
 * profile page shows an anonymous reader, and nothing else.
 */

export const dynamic = "force-dynamic"

/** Bump when the shape changes: the cache keys on the id, not on what comes back. */
const PAYLOAD_VERSION = "v1"

export type MobileAthleteProfile = {
  id: string
  name: string
  photoUrl: string | null
  highSchool: string | null
  club: string | null
  graduationYear: number | null
  /** Published classes only — an unpublished class number is not ours to show. */
  prospectRanking: number | null
  /** What they actually last wrestled at, which is not always the listed weight. */
  weight: {
    display: string | null
    lastCompeted: { weight: string | number | null; year: number | null; event: string | null } | null
  }
  commitment: { college: string; status: string | null; date: string | null } | null
  credentials: { label: string; detail: string; year: number }[]
  stateResults: { year: number; place: number | null; classification: string | null; weightClass: string | null }[]
  /** The Tournament of Champions sits with the state title; everything else is national. */
  toc: TournamentRow[]
  national: TournamentRow[]
}

function asText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : value == null ? "" : String(value)
  return text.length > 0 ? text : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const trimmed = String(id ?? "").trim()
  if (!trimmed) return NextResponse.json({ ok: false, error: "Missing athlete id" }, { status: 400 })

  const admin = createAdminClient()
  const loaded = await loadPublicAthleteProfile(trimmed, admin)
  if (!loaded.ok) {
    return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.code === "not_found" ? 404 : 500 })
  }

  const row = loaded.athlete as unknown as Record<string, unknown>
  const reveal = await buildProfileReveal(admin, row)

  // The loader types these arrays as `unknown[]`; the web profile casts them the same way.
  const rows = buildTournamentRows({
    otherTournamentBlocks: loaded.athlete.other_tournament_blocks,
    nhscaResults: loaded.athlete.nhsca_results as AccordionSummaryResult[],
    super32Results: loaded.athlete.super32_results as AccordionSummaryResult[],
    fargoResults: loaded.athlete.fargo_results as AccordionSummaryResult[],
    nationalTeamResults: loaded.athlete.national_team_results as NationalTeamEntry[],
  })

  const weightDisplay = loaded.athlete.profile_weight_display
  const college = asText(row.college)
  const status = asText(row.recruiting_status)

  const athlete: MobileAthleteProfile = {
    id: reveal.athleteId,
    name: reveal.name,
    photoUrl: reveal.photoUrl,
    highSchool: reveal.highSchool,
    club: reveal.club,
    graduationYear: reveal.graduationYear,
    prospectRanking: reveal.prospectRanking,
    weight: {
      display: asText(weightDisplay?.displayWeight),
      lastCompeted: weightDisplay?.lastCompeted
        ? {
            weight: weightDisplay.lastCompeted.weight ?? null,
            year: weightDisplay.lastCompeted.year ?? null,
            event: asText(weightDisplay.lastCompeted.event),
          }
        : null,
    },
    // Only a real commitment: "PROSPECT" beside a college nobody committed to reads as news.
    commitment: college ? { college, status, date: asText(row.commitmentdate) } : null,
    credentials: reveal.credentials.map((c) => ({ label: c.label, detail: c.detail, year: c.year })),
    stateResults: (loaded.athlete.nchsaa_profile ?? []).map((r) => ({
      year: r.year,
      place: r.place ?? null,
      classification: asText(r.classification),
      weightClass: asText(r.weight_class),
    })),
    toc: rows.filter(isTocRow),
    national: rows.filter((r) => !isTocRow(r)),
  }

  return NextResponse.json(
    { ok: true, version: PAYLOAD_VERSION, athlete },
    {
      headers: {
        // The edge serves this: a reader gets a slightly stale profile rather than a spinner.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  )
}
