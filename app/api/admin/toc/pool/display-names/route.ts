import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

/**
 * Chosen leaderboard names, and clearing one.
 *
 * The word lists in pool-display-name.ts catch the obvious; they will not catch everything a
 * person can think of, and this board sits beside the names of minors. This is the backstop —
 * clearing a name drops that entrant back to a first name and a last initial without touching
 * their entry or their points.
 */

export const dynamic = "force-dynamic"

const TABLE = "toc_pool_display_names"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error, names: [] }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from(TABLE)
    .select("user_id,display_name,updated_at")
    .order("updated_at", { ascending: false })

  if (error) {
    // Before the migration is run there is simply nothing to moderate.
    if (/does not exist|schema cache/i.test(error.message)) return NextResponse.json({ names: [], ready: false })
    console.error("[toc pool] display names:", error.message)
    return NextResponse.json({ error: "Could not load names.", names: [] }, { status: 500 })
  }

  const userIds = (data ?? []).map((row) => String(row.user_id))
  const realNames = new Map<string, string>()
  if (userIds.length) {
    const { data: profiles } = await admin.from("user_profiles").select("user_id,full_name").in("user_id", userIds)
    for (const p of profiles ?? []) if (p.full_name) realNames.set(String(p.user_id), String(p.full_name))
  }

  return NextResponse.json({
    ready: true,
    names: (data ?? []).map((row) => ({
      userId: String(row.user_id),
      displayName: String(row.display_name),
      realName: realNames.get(String(row.user_id)) ?? null,
      updatedAt: row.updated_at ?? null,
    })),
  })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null
  const userId = typeof body?.userId === "string" ? body.userId.trim() : ""
  if (!userId) return NextResponse.json({ error: "Which entrant?" }, { status: 400 })

  const admin = createAdminClient()
  const { error, count } = await admin.from(TABLE).delete({ count: "exact" }).eq("user_id", userId)

  if (error) {
    console.error("[toc pool] clear display name:", error.message)
    return NextResponse.json({ error: "Could not clear that name." }, { status: 500 })
  }
  if (!count) return NextResponse.json({ error: "That entrant has no chosen name." }, { status: 404 })

  return NextResponse.json({ ok: true })
}
