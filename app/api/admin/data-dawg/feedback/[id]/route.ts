import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isDataDawgFeedbackStatus } from "@/lib/data-dawg-feedback"

export const dynamic = "force-dynamic"

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  let body: { status?: string; adminNotes?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const status = body.status
  if (status != null && !isDataDawgFeedbackStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updated_at: now }

  if (body.adminNotes !== undefined) {
    updates.admin_notes = typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 4000) || null : null
  }
  if (status != null) {
    updates.status = status
    updates.reviewed_at = now
    updates.reviewed_by = user?.id ?? null
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("data_dawg_feedback")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    console.error("[RecruitNC] admin data-dawg feedback PATCH", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ item: data })
}
