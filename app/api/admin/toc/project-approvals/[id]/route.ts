import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { sanitizeApprovalStatus } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_approvals"

const STATUS_LABEL: Record<string, string> = {
  pending: "marked pending",
  approved: "approved",
  changes_requested: "requested changes for",
  rejected: "rejected",
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const body = await request.json()
  const status = sanitizeApprovalStatus(body.status)
  const responseNote = String(body.response_note ?? "").trim() || null

  const admin = createAdminClient()
  const decided = status === "pending"
    ? { decided_by_email: null, decided_by_user_id: null, decided_at: null }
    : { decided_by_email: auth.email, decided_by_user_id: auth.userId, decided_at: new Date().toISOString() }

  const { data, error } = await admin
    .from(TABLE)
    .update({
      status,
      response_note: responseNote,
      ...decided,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordTocProjectActivity(admin, {
    actionType: "approval.decided",
    taskId: data.task_id,
    taskTitle: data.task_title,
    category: data.category,
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: `${STATUS_LABEL[status] ?? "updated"} approval “${data.title}”`,
    details: { status, responseNote },
  })

  return NextResponse.json({ approval: data })
}
