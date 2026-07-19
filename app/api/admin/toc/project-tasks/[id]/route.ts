import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { sanitizeProjectStatus } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_tasks"

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

const STATUS_LABEL: Record<string, string> = {
  todo: "Not started",
  in_progress: "On target",
  blocked: "At risk",
  done: "Completed",
}

const FIELD_LABEL: Record<string, string> = {
  category: "category",
  title: "title",
  priority: "priority",
  notes: "notes",
  due_date: "due date",
  delivery_date: "delivery date",
  status: "status",
  budget_amount: "budget",
  actual_amount: "actual spend",
  assignees: "owners",
  links: "links",
  sort_order: "sort order",
}

function normalize(value: unknown): string {
  if (value == null || value === "") return ""
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value ?? null)
  return String(value)
}

function displayValue(key: string, value: unknown): string {
  if (key === "status") return STATUS_LABEL[String(value)] ?? String(value ?? "")
  if (key === "budget_amount" || key === "actual_amount") return value == null || value === "" ? "$0" : `$${Number(value).toLocaleString()}`
  if (key === "assignees" && Array.isArray(value)) {
    return value.map((row) => {
      if (!row || typeof row !== "object") return ""
      const assignee = row as { name?: string; email?: string }
      return assignee.name || assignee.email || ""
    }).filter(Boolean).join(", ")
  }
  if (key === "links" && Array.isArray(value)) return `${value.length} link${value.length === 1 ? "" : "s"}`
  return String(value ?? "")
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
  const { data: previous } = await admin.from(TABLE).select("*").eq("id", id).single()
  const { data, error } = await admin.from(TABLE).update(updates).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (previous) {
    const changes = Object.entries(updates)
      .filter(([key]) => !["updated_by", "updated_at"].includes(key))
      .filter(([key, value]) => normalize(previous[key]) !== normalize(value))
      .map(([key, value]) => ({
        field: key,
        label: FIELD_LABEL[key] ?? key,
        from: displayValue(key, previous[key]),
        to: displayValue(key, value),
      }))

    if (changes.length > 0) {
      const statusChange = changes.find((change) => change.field === "status")
      const notesOnly = changes.length === 1 && changes[0].field === "notes"
      const summary = statusChange
        ? `changed “${data.title}” from ${statusChange.from || "blank"} to ${statusChange.to || "blank"}`
        : notesOnly
          ? `updated notes on “${data.title}”`
          : `updated ${changes.length} field${changes.length === 1 ? "" : "s"} on “${data.title}”`

      await recordTocProjectActivity(admin, {
        actionType: "task.updated",
        taskId: data.id,
        taskTitle: data.title,
        category: data.category,
        actorEmail: auth.email,
        actorUserId: auth.userId,
        summary,
        details: { changes },
      })
    }
  }

  return NextResponse.json({ task: data })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { data: previous } = await admin.from(TABLE).select("id,title,category").eq("id", id).single()
  const { error } = await admin.from(TABLE).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (previous) {
    await recordTocProjectActivity(admin, {
      actionType: "task.deleted",
      taskId: previous.id,
      taskTitle: previous.title,
      category: previous.category,
      actorEmail: auth.email,
      actorUserId: auth.userId,
      summary: `deleted task “${previous.title}”`,
    })
  }

  return NextResponse.json({ ok: true })
}
