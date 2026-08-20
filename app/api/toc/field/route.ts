import { NextResponse } from "next/server"
import {
  getPublicAnnouncedWeight,
  listPublicWeightTiles,
  type PublicAnnouncedWeight,
} from "@/lib/toc/public-announced-field"

export const dynamic = "force-dynamic"

/**
 * The announced TOC field, for the iOS app.
 *
 * `public-announced-field.ts` says there is intentionally no API route wrapping it, because
 * "an endpoint would be enumerable by weight, and the drip release depends on unannounced
 * weights being unreachable." That reasoning is right and this route is built to keep it true:
 *
 * **It takes no parameters.** There is no weight to probe. It returns the set of weights that
 * have already been announced — the same set the public field page renders as plain HTML to
 * anyone who asks — and nothing about weights that have not. A caller learns exactly what a
 * caller of the web page learns, no more, and cannot ask a question about weight 132 that the
 * page would not already answer.
 *
 * The gate itself is not reimplemented here. Weights come from `listPublicWeightTiles`, and
 * each weight's athletes from `getPublicAnnouncedWeight`, which returns null unless
 * `announced_at` is set. If the release rule changes, it changes in one place and this follows.
 */
export async function GET() {
  try {
    const tiles = await listPublicWeightTiles()
    const announcedTiles = tiles.filter((t) => t.announced)

    const weights = (
      await Promise.all(announcedTiles.map((t) => getPublicAnnouncedWeight(t.weightClass)))
    ).filter((w): w is PublicAnnouncedWeight => w != null)

    return NextResponse.json(
      {
        // Every weight class, so the app can show the release cadence — unreleased ones carry
        // announced:false and an athleteCount of 0, exactly as the web grid does.
        tiles,
        weights,
        releasedCount: announcedTiles.length,
      },
      {
        // A reveal should reach the app promptly; a minute of edge caching is worth the
        // thundering herd it prevents when a push goes out to every device at once.
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      },
    )
  } catch (e) {
    console.error("[toc-field]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Could not load the field right now." }, { status: 500 })
  }
}
