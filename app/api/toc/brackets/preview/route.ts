import { NextResponse } from "next/server"
import { buildEightManDeDraw } from "@/lib/toc/eight-man-de-bracket"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { tocBracketsPublicEnabled } from "@/lib/toc/bracket-public-access"
import type { TocBracketParticipant } from "@/lib/toc/bracket-types"

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
 * The result is a projection, not a draw. `official` says so, and stays false until TOC
 * publishes real brackets.
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

    const draw = buildEightManDeDraw(weightClass, participants, new Date().toISOString())

    return NextResponse.json({
      draw,
      // Flips to true when TOC publishes real brackets and this starts serving them instead.
      official: tocBracketsPublicEnabled(),
      weightClass,
      fieldSize: weight.athletes.length,
    })
  } catch (e) {
    console.error("[toc-bracket-preview]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "Could not build that bracket." }, { status: 500 })
  }
}
