import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { INSERT_AI_QUERY_LOG_RPC_HINT, writeAiQueryLog } from "@/lib/ai-query-log-write"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Admin-only: insert one test row into ai_query_logs via RPC (then Prefer-free REST fallback).
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
    .select("id, query, project, timestamp, handler_name, success")
    .order("timestamp", { ascending: false })
    .limit(3)

  const { count: last24h } = await admin
    .from("ai_query_logs")
    .select("id", { count: "exact", head: true })
    .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  let hint: string
  if (write.ok) {
    hint = `Insert succeeded via ${write.path} — refresh analytics with 24h.`
  } else if (write.rpcMissing) {
    hint = INSERT_AI_QUERY_LOG_RPC_HINT
  } else if (/42P10|ON CONFLICT/i.test(write.error)) {
    hint =
      "DB still rejecting inserts (42P10). In Supabase run the ENTIRE scripts/ai-query-logs-on-conflict-fix.sql (creates write_ai_query_log(jsonb) + UNIQUE message_id), confirm select write_ai_query_log(...), then redeploy/Test write."
  } else {
    hint = write.error
  }

  return NextResponse.json({
    ok: write.ok,
    write,
    deploySha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null,
    last24h: last24h ?? 0,
    newest: newest ?? [],
    newestError: newestErr?.message ?? null,
    hint,
  })
}
