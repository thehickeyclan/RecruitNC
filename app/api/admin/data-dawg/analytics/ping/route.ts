import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { writeAiQueryLog } from "@/lib/ai-query-log-write"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Admin-only: insert one test row into ai_query_logs and report write result + newest timestamp.
 * Use when analytics 24h/7d stay at 0 to see the real insert error.
 */
export async function POST(_request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const write = await writeAiQueryLog({
    query: `[analytics ping] ${new Date().toISOString()}`,
    project: "recruit-nc",
    response: "Analytics write test — safe to ignore.",
    query_type: "analytics_ping",
    handler_name: "analytics_ping",
    message_id: `ping-${Date.now()}`,
    success: true,
    response_time_ms: 0,
  })

  const admin = createAdminClient()
  const { data: newest, error: newestErr } = await admin
    .from("ai_query_logs")
    .select("id, query, project, timestamp, handler_name")
    .order("timestamp", { ascending: false })
    .limit(3)

  const { count: last24h } = await admin
    .from("ai_query_logs")
    .select("id", { count: "exact", head: true })
    .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return NextResponse.json({
    ok: write.ok,
    write,
    last24h: last24h ?? 0,
    newest: newest ?? [],
    newestError: newestErr?.message ?? null,
    hint: write.ok
      ? "Insert succeeded — refresh /admin/data-dawg/analytics with 24h."
      : "Insert failed — run scripts/ai-query-logs-table.sql in Supabase (PK + unique message_id), then retry this ping.",
  })
}
