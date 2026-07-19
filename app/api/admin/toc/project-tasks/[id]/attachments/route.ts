import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import type { TocTaskAttachment } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TABLE = "toc_project_tasks"
const BUCKET = "toc-project-attachments"

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 })

  const admin = createAdminClient()
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => null)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120)
  const path = `${id}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path)
  const attachment: TocTaskAttachment = {
    name: file.name,
    url: publicData.publicUrl,
    path,
    type: file.type || null,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: auth.email,
  }

  const { data: task, error: loadError } = await admin.from(TABLE).select("attachments").eq("id", id).single()
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })

  const attachments = Array.isArray(task?.attachments) ? task.attachments : []
  const { data, error } = await admin
    .from(TABLE)
    .update({ attachments: [...attachments, attachment], updated_by: auth.userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ task: data, attachment })
}
