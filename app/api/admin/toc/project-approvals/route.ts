import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import type { TocTaskAttachment, TocTaskLink } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TABLE = "toc_project_approvals"
const TASKS_TABLE = "toc_project_tasks"
const BUCKET = "toc-project-documents"

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "")
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

function parseLinks(value: FormDataEntryValue | null): TocTaskLink[] {
  if (typeof value !== "string") return []
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|")
      const url = (rest.join("|") || label).trim()
      return { label: (rest.length ? label : url).trim(), url }
    })
    .filter((link) => link.url.startsWith("http") || link.url.startsWith("/"))
}

export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false })
  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan-live-patch.sql.txt",
        approvals: [],
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ approvals: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const form = await request.formData()
  const taskIdRaw = String(form.get("taskId") || "").trim()
  const taskId = taskIdRaw && !taskIdRaw.startsWith("seed-") ? taskIdRaw : null
  const title = String(form.get("title") || "").trim()
  if (!title) return NextResponse.json({ error: "approval title required" }, { status: 400 })

  const body = String(form.get("body") || "").trim() || null
  const vendor = String(form.get("vendor") || "").trim() || null
  const amountRaw = String(form.get("amount") || "").trim()
  const amount = amountRaw ? parseCurrency(amountRaw) : null
  const neededBy = String(form.get("neededBy") || "").trim() || null
  const links = parseLinks(form.get("links"))

  const admin = createAdminClient()
  let taskTitle: string | null = null
  let category: string | null = String(form.get("category") || "").trim() || null

  if (taskId) {
    const { data: task, error: taskError } = await admin.from(TASKS_TABLE).select("title,category").eq("id", taskId).single()
    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })
    taskTitle = task?.title ?? null
    category = task?.category ?? category
  }

  const files = form.getAll("files").filter((value): value is File => value instanceof File)
  const attachments: TocTaskAttachment[] = []
  if (files.length > 0) {
    await admin.storage.createBucket(BUCKET, { public: true }).catch(() => null)
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120)
      const path = `approvals/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(path)
      attachments.push({
        name: file.name,
        url: publicData.publicUrl,
        path,
        type: file.type || null,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: auth.email,
      })
    }
  }

  const payload = {
    task_id: taskId,
    task_title: taskTitle,
    category,
    title,
    body,
    vendor,
    amount,
    needed_by: neededBy,
    status: "pending",
    attachments,
    links,
    requested_by_email: auth.email,
    requested_by_user_id: auth.userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin.from(TABLE).insert(payload).select("*").single()
  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({ error: `Approval table missing. Run docs/sql/toc-project-plan-live-patch.sql.txt in Supabase.` }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await recordTocProjectActivity(admin, {
    actionType: "approval.requested",
    taskId,
    taskTitle,
    category,
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: `requested approval for “${title}”`,
    details: { vendor, amount, neededBy, attachmentCount: attachments.length, linkCount: links.length, body },
  })

  return NextResponse.json({ approval: data })
}
