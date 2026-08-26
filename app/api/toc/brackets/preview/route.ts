import { NextResponse } from "next/server"
import { buildEightManDeDraw } from "@/lib/toc/eight-man-de-bracket"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { tocBracketsPublicEnabled } from "@/lib/toc/bracket-public-access"
import { getLockedDraw } from "@/lib/toc/bracket-service"
import { createAdminClient } from "@/lib/supabase/admin"
import type { TocBracketParticipant } from "@/lib/toc/bracket-types"
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

const MAX_PARTICIPANTS = 16

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { weightClass?: number; athleteIds?: string[] }
      | null

    const weightClass = Number(body?.weightClass)
    if (!Number.isFinite(weightClass)) {
      return NextResponse.json({ error: "weightClass is required" }, { status: 400 })
    }

    const order = Array.isArray(body?.athleteIds) ? body.athleteIds.map(String) : []
    if (order.length === 0) {
      return NextResponse.json({ error: "athleteIds is required" }, { status: 400 })
    }
    if (order.length > MAX_PARTICIPANTS) {
      return NextResponse.json({ error: "Too many wrestlers for one bracket." }, { status: 400 })
    }

    // The gate: null for any weight that has not been released publicly.
    const weight = await getPublicAnnouncedWeight(weightClass)
    if (!weight) {
      return NextResponse.json({ error: "That weight has not been announced yet." }, { status: 404 })
    }

    // Once brackets are public, the locked draw is the bracket — the caller's ordering is
    // ignored rather than dressed up as official. A weight with no locked draw yet keeps
    // projecting, so weights can be released one at a time.
    if (tocBracketsPublicEnabled()) {
      const locked = await getLockedDraw(createAdminClient(), weightClass)
      if (locked) {
        const lockedConsolation = tocDrawToConsolationBracketTree(locked)
        return NextResponse.json({
          draw: locked,
          layout: {
            championship: layoutBracketTree(tocDrawToWinnersBracketTree(locked)),
            consolation: lockedConsolation ? layoutBracketTree(lockedConsolation) : null,
          },
          official: true,
          weightClass,
          fieldSize: locked.participants.length,
        })
      }
    }

    const byId = new Map(weight.athletes.map((a) => [a.athleteId, a]))

    // Only ids that are actually in this weight's public field, de-duplicated, in the caller's
    // order. An unknown id is dropped rather than rejected — a stale pick from before a field
    // update should not fail the whole bracket.
    const seen = new Set<string>()
    const participants: TocBracketParticipant[] = []
    for (const id of order) {
      if (seen.has(id)) continue
      const athlete = byId.get(id)
      if (!athlete) continue
      seen.add(id)
      participants.push({
        athleteId: athlete.athleteId,
        invitationId: `preview-${athlete.athleteId}`,
        seed: participants.length + 1,
        name: athlete.name,
        school: athlete.club,
        photoUrl: athlete.photoUrl,
        graduationYear: athlete.graduationYear,
      })
    }

    if (participants.length === 0) {
      return NextResponse.json(
        { error: "None of those wrestlers are in this weight's announced field." },
        { status: 400 },
      )
    }

    // Size the bracket from the announced field, not from how many the user has seeded so far.
    // Without this a nine-wrestler weight draws an eight-man bracket until the ninth tap, so
    // somebody seeding 133 watches the wrong format take shape — and anyone who stops at eight
    // keeps a complete-looking bracket that is not the one that will be wrestled.
    const announced = weight.athletes.length
    const draw = buildEightManDeDraw(
      weightClass,
      participants,
      new Date().toISOString(),
      announced > 8 ? announced : undefined,
    )

    // Laid out here, not in the app: the same layout engine the desktop bracket uses, so the
    // two draw the same shape rather than two implementations drifting apart. The app renders
    // the positions it is given.
    const consolationTree = tocDrawToConsolationBracketTree(draw)

    return NextResponse.json({
      draw,
      layout: {
        // The winners tree, not the seeded one. Both draw the same shape, but the seeded tree
        // is generated from seeds and carries no bout numbers — so every tap in the app hit a
        // match it could not identify and did nothing. This one is built from the draw's own
        // bouts, so a tap knows which bout it is picking.
        championship: layoutBracketTree(tocDrawToWinnersBracketTree(draw)),
        consolation: consolationTree ? layoutBracketTree(consolationTree) : null,
      },
      // A projection: either brackets are still private, or this weight has no locked draw yet.
      official: false,
      weightClass,
      fieldSize: weight.athletes.length,
    })
  } catch (e) {
    console.error("[toc-bracket-preview]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Could not build that bracket." }, { status: 500 })
  }
}
