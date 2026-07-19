import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_documents"
const BUCKET = "toc-project-documents"

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { data: document, error: loadError } = await admin.from(TABLE).select("title,category,path,file_name").eq("id", id).single()
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })

  const { error } = await admin.from(TABLE).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (document?.path) {
    await admin.storage.from(BUCKET).remove([document.path]).catch(() => null)
  }

  await recordTocProjectActivity(admin, {
    actionType: "document.deleted",
    category: document.category,
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: `deleted shared document “${document.title}”`,
    details: { fileName: document.file_name },
  })

  return NextResponse.json({ ok: true })
}
