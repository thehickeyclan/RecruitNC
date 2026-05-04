import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * POST: Staff links a RecruitNC auth user to an athlete (`parent_athlete_links`). Use for parent **or** athlete accounts
 * (fundraising page access does not use profile claim — only this link). Body: { athleteId, parentUserId } where
 * `parentUserId` is the Supabase `user.id` to connect (name is historical).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { athleteId?: string; parentUserId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const athleteId = typeof body.athleteId === "string" ? body.athleteId.trim() : ""
  const parentUserId = typeof body.parentUserId === "string" ? body.parentUserId.trim() : ""
  if (!athleteId || !parentUserId) {
    return NextResponse.json({ error: "athleteId and parentUserId are required." }, { status: 400 })
  }

  const admin = createAdminClientFresh()
  const { data: athlete, error: athleteErr } = await admin.from("athletes").select("id, name").eq("id", athleteId).maybeSingle()
  if (athleteErr || !athlete) {
    return NextResponse.json({ error: "Athlete not found." }, { status: 404 })
  }

  const { data: existingLink } = await admin
    .from("parent_athlete_links")
    .select("id")
    .eq("user_id", parentUserId)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  if (existingLink) {
    return NextResponse.json({
      success: true,
      message: `Already linked — ${athlete.name ?? athleteId} is tied to this RecruitNC account.`,
      athleteId,
      parentUserId,
    })
  }

  let insertErr = (
    await admin.from("parent_athlete_links").insert({
      user_id: parentUserId,
      athlete_id: athleteId,
    })
  ).error

  if (
    insertErr &&
    /row-level security|42501/i.test(`${insertErr.message} ${insertErr.code ?? ""}`)
  ) {
    const rpc = await admin.rpc("insert_parent_athlete_link_admin", {
      p_parent_user_id: parentUserId,
      p_athlete_id: athleteId,
    })
    if (!rpc.error) {
      insertErr = null
    } else if (
      rpc.error.code === "42883" ||
      /does not exist|could not find.*function/i.test(rpc.error.message ?? "")
    ) {
      console.error("[admin/parent-athlete-link] RLS blocked insert; RPC not installed:", rpc.error.message)
    } else {
      insertErr = rpc.error
    }
  }

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({
        success: true,
        message: `Already linked — ${athlete.name ?? athleteId} is tied to this RecruitNC account.`,
        athleteId,
        parentUserId,
      })
    }
    console.error("[admin/parent-athlete-link]", insertErr)
    const rlsHint =
      /row-level security/i.test(insertErr.message)
        ? " Confirm Vercel SUPABASE_SERVICE_ROLE_KEY is the service_role secret (not anon). Optional: run docs/sql/parent-athlete-link-admin-rpc.sql.txt in Supabase SQL Editor."
        : ""
    return NextResponse.json({ error: `${insertErr.message}${rlsHint}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Linked ${athlete.name ?? athleteId} to the selected RecruitNC account — they’ll see this wrestler under Profile → Family & athletes and can manage their fundraising page when staff set one up.`,
    athleteId,
    parentUserId,
  })
}
