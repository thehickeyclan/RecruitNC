import { NextResponse } from "next/server"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { TOC_BRACKET_RELEASE_LINE } from "@/lib/toc/constants"
import { readBracketRelease } from "@/lib/toc/bracket-release"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { createAdminClient } from "@/lib/supabase/admin"
import { layoutBracketTree } from "@/lib/bracket/single-elim-layout"
import {
  tocDrawToConsolationBracketTree,
  tocDrawToWinnersBracketTree,
} from "@/lib/toc/to-bracket-display"

export const dynamic = "force-dynamic"

/**
 * Builds a bracket from someone's own ordering of an announced weight.
 *
 * This is deliberately separate from `/api/toc/brackets/[weight]`, which is staff-only and
 * serves the real draw. Two rules from `public-announced-field.ts` shape everything here:
 *
 * 1. **The public field is not seeded**, and "seed order must not be inferable from row order."
 *    So the seeds in the returned draw are the *caller's* ordering, never ours. Nothing about
 *    the official seeding is read, derived, or implied — which also rules out starting someone
 *    off from the AI seed recommendations, since those live on the private field board.
 * 2. **Unannounced weights are unreachable.** The weight is resolved through
 *    `getPublicAnnouncedWeight`, which returns null unless `announced_at` is set, so a bracket
 *    cannot be built for a weight whose field is still private.
 *
 * Until TOC publishes real brackets the result is a projection, not a draw, and `official` says
 * so. Once they are published this serves the locked draw instead and ignores the caller's
 * ordering entirely — everyone has to be looking at the same bracket, or a pool entry means a
 * different pairing for every entrant who submits one.
 */

export async function POST(request: Request) {
  try {
    /**
     * The same kill switch the rest of the bracket surface obeys.
     *
     * `bracket-public-access` says brackets are admin-only until the flag is set, and every other
     * bracket page and route enforces it — this one only consulted the flag to decide whether to
     * serve the *locked* draw, and served a projection to anyone regardless. With no account at
     * all you could post an announced weight's athlete ids and get back a seeded eight-man draw
     * with twelve bouts. It carried `official: false`, which is invisible the moment somebody
     * screenshots it: parents saw children passing around what looked like their weight's bracket.
     */
    const admin = createAdminClient()
    const release = await readBracketRelease(admin)
    // 200 with a reason, not a 404. The app prints whatever comes back on this screen, and
    // "Not found" in red reads as a broken app rather than as a tournament that has not
    // released its brackets yet.
    if (!release.released) {
      return NextResponse.json(
        { released: false, error: TOC_BRACKET_RELEASE_LINE },
        { status: 200 },
      )
    }

    const body = (await request.json().catch(() => null)) as
      | { weightClass?: number; athleteIds?: string[] }
      | null

    const weightClass = Number(body?.weightClass)
    if (!Number.isFinite(weightClass)) {
      return NextResponse.json({ error: "weightClass is required" }, { status: 400 })
    }

    // `athleteIds` is still accepted from older builds and deliberately ignored — the seeding is
    // ours. Rejecting it would break the app already on people's phones for no gain.

    // The gate: null for any weight that has not been released publicly.
    const weight = await getPublicAnnouncedWeight(weightClass)
    if (!weight) {
      return NextResponse.json({ error: "That weight has not been announced yet." }, { status: 404 })
    }

    /**
     * The seeding is ours, and the only seeding there is.
     *
     * This used to build a bracket from whatever order the caller sent, so anyone could produce a
     * plausible-looking draw for an announced weight and pass it around — which is exactly what
     * happened. The caller's ordering is not read at all now: a released weight returns the draw
     * staff locked, and an unreleased one returns nothing. What people bring to a bracket is their
     * picks, not their seeds.
     */
    const locked = await getLockedDraw(admin, weightClass)
    if (!locked) {
      // Brackets are already out by the time this branch runs — the release gate above returned
      // for everything before 5:00 — so a weight with no locked draw is one being redrawn, not
      // one waiting for Friday. Repeating the "released Friday at 5:00 PM" line here after 5:00
      // told people a time that had already passed. `released: false` stays: it is what the app
      // keys the calm, not-an-error state on, and the app prints this line underneath it.
      return NextResponse.json(
        {
          released: false,
          error: `The ${weightClass} lb bracket is being finalized. Check back soon — it will appear here as soon as it is ready.`,
        },
        { status: 200 },
      )
    }

    // Laid out here, not in the app: the same layout engine the desktop bracket uses, so the
    // two draw the same shape rather than two implementations drifting apart. The app renders
    // the positions it is given.
    const consolationTree = tocDrawToConsolationBracketTree(locked)

    return NextResponse.json({
      draw: locked,
      layout: {
        // The winners tree, not the seeded one. Both draw the same shape, but the seeded tree
        // carries no bout numbers — so every tap in the app hit a match it could not identify
        // and did nothing. This one is built from the draw's own bouts.
        championship: layoutBracketTree(tocDrawToWinnersBracketTree(locked)),
        consolation: consolationTree ? layoutBracketTree(consolationTree) : null,
      },
      official: true,
      weightClass,
      fieldSize: locked.participants.length,
    })
  } catch (e) {
    console.error("[toc-bracket-preview]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Could not build that bracket." }, { status: 500 })
  }
}
