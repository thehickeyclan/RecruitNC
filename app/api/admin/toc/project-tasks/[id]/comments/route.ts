import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import type { TocTaskComment } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_tasks"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const body = await request.json()
  const commentBody = String(body.body ?? "").trim()
  if (!commentBody) return NextResponse.json({ error: "comment required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: task, error: loadError } = await admin.from(TABLE).select("comments").eq("id", id).single()
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })

  const comments = Array.isArray(task?.comments) ? task.comments : []
  const comment: TocTaskComment = {
    id: crypto.randomUUID(),
    body: commentBody,
    createdAt: new Date().toISOString(),
    createdBy: {
      userId: auth.userId,
      email: auth.email,
      name: auth.email,
    },
  }

  const { data, error } = await admin
    .from(TABLE)
    .update({ comments: [...comments, comment], updated_by: auth.userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data, comment })
}
