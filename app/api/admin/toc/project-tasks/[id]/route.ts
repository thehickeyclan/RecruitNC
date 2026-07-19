import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { sanitizeProjectStatus } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_tasks"

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const body = await request.json()
  const updates: Record<string, unknown> = { updated_by: auth.userId, updated_at: new Date().toISOString() }

  for (const key of ["category", "title", "priority", "notes", "due_date", "delivery_date"]) {
    if (key in body) updates[key] = body[key] === "" ? null : body[key]
  }
  if ("status" in body) updates.status = sanitizeProjectStatus(body.status)
  if ("budget_amount" in body) updates.budget_amount = body.budget_amount === "" || body.budget_amount == null ? null : Number(body.budget_amount)
  if ("actual_amount" in body) updates.actual_amount = body.actual_amount === "" || body.actual_amount == null ? null : Number(body.actual_amount)
  if ("assignees" in body) updates.assignees = asArray(body.assignees)
  if ("links" in body) updates.links = asArray(body.links)
  if ("attachments" in body) updates.attachments = asArray(body.attachments)
  if ("sort_order" in body) updates.sort_order = Number(body.sort_order)

  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).update(updates).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { error } = await admin.from(TABLE).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
