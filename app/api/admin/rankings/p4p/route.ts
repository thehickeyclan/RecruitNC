import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPoundForPoundBoard } from "@/lib/rankings/pound-for-pound-load"

export const dynamic = "force-dynamic"

/** Three classes of results and every cross-class bout between them; the class board needs 60. */
export const maxDuration = 60

const cachedBoard = unstable_cache(
  async (gender: string) => buildPoundForPoundBoard({ supabase: createAdminClient(), gender }),
  // Bump when `PoundForPoundEntry` changes shape: a cached payload outlives a deploy, and the
  // class board has already been taken down once by older data reaching newer code.
  ["admin-p4p-board", "v1"],
  { revalidate: 600, tags: ["admin-p4p-board"] },
)

/** Admin or nothing. Both verbs need it, so it lives in one place. */
async function requireAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .single()
  if (!profile?.is_admin && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true }
}

export async function GET(request: Request) {
  try {
    /*
     * Gated, and gated here rather than only in the page. This is an unpublished ranking of
     * minors across three classes, and a ranking hidden only by the UI is one guessed path away
     * from not being hidden at all.
     */
    const gate = await requireAdmin()
    if (!gate.ok) return gate.response

    const { searchParams } = new URL(request.url)
    const gender = searchParams.get("gender") || "Male"
    const fresh = searchParams.get("refresh") === "1"
    const board = fresh
      ? await buildPoundForPoundBoard({ supabase: createAdminClient(), gender })
      : await cachedBoard(gender)

    /*
     * A saved hand order replaces the engine's, because the engine is a starting point and the
     * person is the ranking. Never cached: an order saved thirty seconds ago has to be on screen
     * now, and the class board learned that lesson by serving admins their own stale work.
     * A missing table must not take the page down with it.
     */
    let savedOrder = new Map<string, number>()
    try {
      const { data } = await createAdminClient()
        .from("p4p_drafts")
        .select("athlete_id, rank")
        .eq("gender", gender)
      savedOrder = new Map((data ?? []).map((row) => [String(row.athlete_id), Number(row.rank)]))
    } catch {
      savedOrder = new Map()
    }
    const entries = savedOrder.size
      ? [...board.entries]
          .sort(
            (a, b) =>
              (savedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                (savedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.rank - b.rank,
          )
          .map((entry, i) => ({ ...entry, rank: i + 1 }))
      : board.entries

    return NextResponse.json({
      entries,
      meta: { ...board.meta, gender, savedCount: savedOrder.size },
    })
  } catch (error) {
    console.error("[rankings-p4p] GET failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build pound-for-pound board" },
      { status: 500 },
    )
  }
}

/**
 * Save the hand order.
 *
 * Stored whole rather than as a diff from the engine: the engine's order moves every time a
 * result is imported, so a diff would silently mean something different tomorrow. The rows are
 * replaced outright for the same reason a partial save is worse than none.
 */
export async function POST(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.response

    const body = await request.json()
    const gender = String(body?.gender || "Male")
    const order = Array.isArray(body?.order) ? body.order : []
    if (!order.length) {
      return NextResponse.json({ error: "No order provided" }, { status: 400 })
    }
    const rows = order
      .map((row: { id?: string; rank?: number }) => ({
        athlete_id: String(row?.id ?? ""),
        rank: Number(row?.rank),
        gender,
      }))
      .filter((row: { athlete_id: string; rank: number }) => row.athlete_id && Number.isFinite(row.rank))
    if (rows.length !== order.length) {
      return NextResponse.json({ error: "Order contained an invalid row" }, { status: 400 })
    }

    const db = createAdminClient()
    const { error: clearError } = await db.from("p4p_drafts").delete().eq("gender", gender)
    if (clearError) throw clearError
    const { error: insertError } = await db.from("p4p_drafts").insert(rows)
    if (insertError) throw insertError

    return NextResponse.json({ success: true, saved: rows.length })
  } catch (error) {
    console.error("[rankings-p4p] POST failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save order" },
      { status: 500 },
    )
  }
}
