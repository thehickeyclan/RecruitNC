import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { sanitizeProjectStatus, tocProjectSeedTasks } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_tasks"

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function seedInsertPayload(userId: string) {
  return tocProjectSeedTasks().map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...task }) => ({
    ...task,
    created_by: userId,
    updated_by: userId,
  }))
}

export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).select("*").order("sort_order", { ascending: true })
  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan.sql",
        currentUser: { userId: auth.userId, email: auth.email },
        tasks: tocProjectSeedTasks(),
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ((data ?? []).length === 0) {
    const { error: seedError } = await admin.from(TABLE).upsert(seedInsertPayload(auth.userId), { onConflict: "category,title" })

    if (seedError) {
      return NextResponse.json({ error: `TOC task table is empty and auto-seed failed: ${seedError.message}` }, { status: 500 })
    }

    const { data: seeded, error: reloadError } = await admin.from(TABLE).select("*").order("sort_order", { ascending: true })
    if (reloadError) return NextResponse.json({ error: reloadError.message }, { status: 500 })
    return NextResponse.json({
      currentUser: { userId: auth.userId, email: auth.email },
      tasks: seeded ?? [],
      seeded: true,
    })
  }

  return NextResponse.json({
    currentUser: { userId: auth.userId, email: auth.email },
    tasks: data ?? [],
  })
}

export async function POST(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const category = String(body.category ?? "").trim()
  const title = String(body.title ?? "").trim()
  if (!category || !title) return NextResponse.json({ error: "category and title required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: maxRows } = await admin.from(TABLE).select("sort_order").order("sort_order", { ascending: false }).limit(1)
  const nextOrder = Number(maxRows?.[0]?.sort_order ?? 0) + 10

  const payload = {
    category,
    title,
    status: sanitizeProjectStatus(body.status),
    priority: String(body.priority ?? "normal"),
    sort_order: Number(body.sort_order ?? nextOrder),
    budget_amount: body.budget_amount === "" || body.budget_amount == null ? null : Number(body.budget_amount),
    actual_amount: body.actual_amount === "" || body.actual_amount == null ? null : Number(body.actual_amount),
    due_date: body.due_date || null,
    notes: body.notes ? String(body.notes) : null,
    assignees: asArray(body.assignees),
    links: asArray(body.links),
    attachments: [],
    comments: [],
    created_by: auth.userId,
    updated_by: auth.userId,
  }

  const { data, error } = await admin.from(TABLE).insert(payload).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}
