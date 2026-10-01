import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * A person's decision on one result: this is the wrestler, or it is not.
 *
 * Final: the backfill never rewrites a row with `reviewed_at` set, so an import cannot undo it.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from("user_profiles").select("is_admin").eq("user_id", user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { action?: string; athleteId?: string }
  const { data: link } = await admin.from("result_athlete_links").select("id,candidates").eq("id", id).maybeSingle()
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const stamp = { reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(), method: "manual" }
  let update: Record<string, unknown>
  if (body.action === "link") {
    // Only a profile the matcher offered: the screen is a choice between candidates, not a search.
    const offered = (link.candidates ?? []).some((c: any) => c.athleteId === body.athleteId)
    if (!body.athleteId || !offered) return NextResponse.json({ error: "Pick one of the profiles shown" }, { status: 400 })
    update = { ...stamp, status: "linked", athlete_id: body.athleteId, reason: "confirmed by a person" }
  } else if (body.action === "reject") {
    update = { ...stamp, status: "rejected", athlete_id: null, reason: "not this wrestler (a person)" }
  } else {
    return NextResponse.json({ error: "action must be link or reject" }, { status: 400 })
  }

  const { error } = await admin.from("result_athlete_links").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
