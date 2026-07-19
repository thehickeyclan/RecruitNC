import type { SupabaseClient } from "@supabase/supabase-js"

const ACTIVITY_TABLE = "toc_project_activity"

type ActivityInput = {
  actionType: string
  taskId?: string | null
  taskTitle?: string | null
  category?: string | null
  actorEmail: string
  actorUserId?: string | null
  summary: string
  details?: Record<string, unknown> | null
}

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(ACTIVITY_TABLE)
}

export async function recordTocProjectActivity(admin: SupabaseClient, input: ActivityInput): Promise<void> {
  const { error } = await admin.from(ACTIVITY_TABLE).insert({
    action_type: input.actionType,
    task_id: input.taskId ?? null,
    task_title: input.taskTitle ?? null,
    category: input.category ?? null,
    actor_email: input.actorEmail,
    actor_user_id: input.actorUserId ?? null,
    summary: input.summary,
    details: input.details ?? null,
  })

  if (error && !tableMissing(error)) {
    console.warn("[TOC Project] Activity log failed:", error.message)
  }
}
