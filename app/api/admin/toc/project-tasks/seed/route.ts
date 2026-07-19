import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { tocProjectSeedTasks } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_tasks"

function seedPayload(userId: string) {
  return tocProjectSeedTasks().map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...task }) => ({
    ...task,
    created_by: userId,
    updated_by: userId,
  }))
}

export async function POST() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const rows = seedPayload(auth.userId)
  const { error: upsertError } = await admin.from(TABLE).upsert(rows, { onConflict: "category,title" })
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  const { data, error } = await admin.from(TABLE).select("*").order("sort_order", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tasks: data ?? [], seeded: true })
}
