import { NextResponse } from "next/server"
import {
  getPublicAnnouncedWeight,
  listPublicWeightTiles,
  type PublicAnnouncedWeight,
} from "@/lib/toc/public-announced-field"

export const dynamic = "force-dynamic"

/**
 * Long enough for a cold rebuild.
 *
 * Reconciling every wrestler in the field takes about thirty seconds when nothing is cached, and
 * Vercel's default cut it off well before that — which surfaces as a failed request rather than a
 * slow one. The cache means this is rare; the ceiling means it does not fail when it happens.
 */
export const maxDuration = 60


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

    /*
     * Every announced weight, or none of them.
     *
     * That filter used to be the last word, so a weight that failed to load simply was not in the
     * response — and the app has no way to tell "285 has not been announced" from "285 failed".
     * 285 lbs went out to phones as an empty weight class for exactly this reason. Answering with
     * an error is recoverable; answering with a field that is quietly missing a weight is not.
     */
    if (weights.length !== announcedTiles.length) {
      const missing = announcedTiles
        .map((t) => t.weightClass)
        .filter((w) => !weights.some((loaded) => loaded.weightClass === w))
      throw new Error(`announced weights failed to load: ${missing.join(", ")}`)
    }

    return NextResponse.json(
      {
        // Every weight class, so the app can show the release cadence — unreleased ones carry
        // announced:false and an athleteCount of 0, exactly as the web grid does.
        tiles,
        weights,
        releasedCount: announcedTiles.length,
      },
      {
        /*
         * The edge is what actually serves this, and it is what keeps the app fast.
         *
         * Rebuilding the field at the origin reconciles every wrestler by name and takes about
         * twenty-five seconds, so the goal is that almost nobody ever waits for one. Five minutes
         * fresh, then a day of serving the last good answer while a new one is fetched behind the
         * scenes — a reader gets a stale field rather than a spinner, and never a cold rebuild.
         *
         * Staleness is safe here because this is the roster, not the draw. Releasing brackets does
         * not change who is in a weight, and the bracket itself comes from a different route. The
         * one thing that does change it — announcing a weight — is rare, deliberate, and already
         * followed by a warm.
         */
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" },
      },
    )
  } catch (e) {
    console.error("[toc-field]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Could not load the field right now." }, { status: 500 })
  }
}
