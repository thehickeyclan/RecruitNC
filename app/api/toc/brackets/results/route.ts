import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { readBracketRelease } from "@/lib/toc/bracket-release"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { TOC_BRACKET_RELEASE_LINE, TOC_LIVE_FROM, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { toBoutResultsView, type BoutResultRow } from "@/lib/toc/bout-results-view"

/**
 * What has actually happened, bout by bout.
 *
 * Results were already being recorded during the tournament — the pool scores itself from them —
 * but nothing showed them to anyone. A family watching from home had the draw and no way to learn
 * that their kid won bout 2, and the only place a result surfaced at all was a points column on
 * the leaderboard.
 *
 * Public on purpose, and deliberately not gated on an account: a result at a tournament is public
 * the second it happens on the mat. The release gate still applies, because before five o'clock on
 * Friday there is no bracket to have results for.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const admin = createAdminClient()
  const release = await readBracketRelease(admin)
  // 200 with a reason, like the preview route: the app prints this rather than showing an error.
  if (!release.released) {
    return NextResponse.json({ released: false, error: TOC_BRACKET_RELEASE_LINE }, { status: 200 })
  }

  const requested = Number(request.nextUrl.searchParams.get("weightClass"))
  const weights = Number.isInteger(requested) ? [requested] : [...TOC_WEIGHT_CLASSES]
  if (Number.isInteger(requested) && !TOC_WEIGHT_CLASSES.includes(requested as (typeof TOC_WEIGHT_CLASSES)[number])) {
    return NextResponse.json({ error: "Unknown weight class." }, { status: 400 })
  }

  const { data, error } = await admin
    .from("toc_bout_results")
    .select("weight_class,bout_number,winner_athlete_id,method,winner_score,loser_score,recorded_at,updated_at")
    .in("weight_class", weights)

  if (error) {
    console.error("[toc/brackets/results]", error.message)
    return NextResponse.json({ error: "Could not load results." }, { status: 500 })
  }

  const rowsByWeight = new Map<number, BoutResultRow[]>()
  for (const row of data ?? []) {
    const weight = Number(row.weight_class)
    rowsByWeight.set(weight, [...(rowsByWeight.get(weight) ?? []), row as BoutResultRow])
  }

  const perWeight = await Promise.all(
    weights.map(async (weightClass) => {
      const view = toBoutResultsView(rowsByWeight.get(weightClass) ?? [])
      // Total bouts comes from the locked draw, so "12 of 12" means what the bracket actually holds
      // rather than a number this route invented.
      const draw = await getLockedDraw(admin, weightClass)
      return {
        weightClass,
        // Whether this weight has a locked draw at all. Kept distinct from the tournament-wide
        // `released` flag below: spreading both into one object had the weight silently overwrite
        // the tournament, which is how a released tournament could report itself unreleased.
        hasDraw: draw != null,
        totalBouts: draw?.bouts.length ?? 0,
        ...view,
      }
    }),
  )

  const newest = perWeight.reduce<string | null>(
    (latest, w) => (w.lastUpdated && (!latest || w.lastUpdated > latest) ? w.lastUpdated : latest),
    null,
  )

  /**
   * Live once weigh-ins close, or earlier if a bout has already been recorded.
   *
   * Served rather than computed in the app so the moment can move — weigh-ins running long is a
   * website deploy, not an App Store release. The app knows the same clock and takes whichever
   * says live, so a phone offline at five o'clock still relabels itself.
   */
  const live = Date.now() >= TOC_LIVE_FROM.getTime() || perWeight.some((w) => w.recorded > 0)

  const single = Number.isInteger(requested) ? perWeight[0] : null
  if (single) return NextResponse.json({ released: true, live, ...single })
  return NextResponse.json({ released: true, live, lastUpdated: newest, weights: perWeight })
}
