import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPoundForPoundBoard } from "@/lib/rankings/pound-for-pound-load"
import { TOP_100_CAP } from "@/lib/rankings/top-100-view"

/**
 * The Top 75 College Prospects board an admin works on.
 *
 * Same shape as the P4P route next door, with one difference that is the whole point: the pool
 * reaches past each class's published cut. The Top 75 Ranked Prospects list can only hold wrestlers on their
 * class board, which left five state champions in a deep 2027 invisible to a college coach.
 *
 * Gated here and not only in the page: this is an unpublished ranking of minors, and a ranking
 * hidden by the UI alone is one guessed path away from not being hidden.
 */

/** How deep into each class this board may reach. Class boards still publish 30/30/15. */
/*
 * How deep into each class the pool reaches. Class boards still publish 30/30/15.
 *
 * Deeper than the boards by a wide margin, and deliberately so: a wrestler outside this pool is
 * dropped from a saved order without a word, and the engine backfills his slot with someone who
 * was deliberately cut. That silently deleted five hand-placed wrestlers - including a state
 * runner-up - and put four removed wrestlers back above the publishing line.
 */
const CLASS_DEPTHS: Readonly<Record<number, number>> = { 2027: 75, 2028: 60, 2029: 35 }

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender") || "Male"
    const admin = createAdminClient()

    const board = await buildPoundForPoundBoard({ supabase: admin, gender, classDepths: CLASS_DEPTHS })

    /*
     * A saved hand order replaces the engine's, because the engine is a starting point and the
     * person is the ranking. Never cached: an order saved seconds ago has to be on screen now.
     */
    let savedOrder = new Map<string, number>()
    try {
      const { data } = await admin.from("top_100_drafts").select("athlete_id, rank").eq("gender", gender)
      savedOrder = new Map((data ?? []).map((row) => [String(row.athlete_id), Number(row.rank)]))
    } catch {
      savedOrder = new Map()
    }

    // Nothing saved yet: fall back to what is already published, so the page opens on the live list.
    if (savedOrder.size === 0) {
      const { data } = await admin.from("top_100_rankings").select("athlete_id, rank").eq("gender", gender)
      savedOrder = new Map((data ?? []).map((row) => [String(row.athlete_id), Number(row.rank)]))
    }

    /*
     * A saved order is the board; the rest of the pool are candidates and sort below it. They are
     * kept visible because the wrestlers just outside the cut are the ones worth reconsidering,
     * but they must never displace a hand-placed wrestler.
     */
    const entries = savedOrder.size
      ? [...board.entries]
          .sort(
            (a, b) =>
              (savedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                (savedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.rank - b.rank,
          )
          .map((entry, i) => ({ ...entry, rank: i + 1, onBoard: savedOrder.has(entry.id) }))
      : board.entries.map((entry) => ({ ...entry, onBoard: false }))

    const { data: published } = await admin
      .from("top_100_rankings")
      .select("published_at")
      .eq("gender", gender)
      .limit(1)

    return NextResponse.json({
      entries,
      meta: {
        ...board.meta,
        gender,
        cap: TOP_100_CAP,
        savedCount: savedOrder.size,
        publishedAt: published?.[0]?.published_at ?? null,
      },
    })
  } catch (error) {
    console.error("[rankings-top-100] GET failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build the board" },
      { status: 500 },
    )
  }
}

/** Save the hand order, and publish it when asked. */
export async function POST(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

    const body = await request.json().catch(() => null)
    const gender = String(body?.gender ?? "Male")
    const order: string[] = Array.isArray(body?.order) ? body.order.map(String) : []
    const publish = body?.publish === true
    if (!order.length) return NextResponse.json({ error: "No order provided" }, { status: 400 })

    const db = createAdminClient()
    const now = new Date().toISOString()
    const rows = order.map((athlete_id, i) => ({ athlete_id, gender, rank: i + 1 }))

    await db.from("top_100_drafts").delete().eq("gender", gender)
    const { error: saveError } = await db.from("top_100_drafts").insert(rows)
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

    if (!publish) return NextResponse.json({ ok: true, saved: rows.length })

    /*
     * Publishing writes only the wrestlers above the cut. The draft keeps everyone, because next time the
     * order is revisited the wrestlers just below the cut are the ones worth seeing.
     */
    const cut = rows.slice(0, TOP_100_CAP).map((r) => ({ ...r, published_at: now }))
    const { error: clearError } = await db.from("top_100_rankings").delete().eq("gender", gender)
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 })
    const { error: publishError } = await db.from("top_100_rankings").insert(cut)
    if (publishError) return NextResponse.json({ error: publishError.message }, { status: 500 })

    return NextResponse.json({ ok: true, saved: rows.length, published: cut.length, publishedAt: now })
  } catch (error) {
    console.error("[rankings-top-100] POST failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save the board" },
      { status: 500 },
    )
  }
}
