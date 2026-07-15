import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { INSERT_AI_QUERY_LOG_RPC_HINT, writeAiQueryLog } from "@/lib/ai-query-log-write"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Admin-only: insert one test row via write_data_dawg_query_log (clean table).
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
  let newest: unknown[] = []
  let newestError: string | null = null
  let last24h = 0

  for (const table of ["data_dawg_query_logs", "ai_query_logs"] as const) {
    const { data, error } = await admin
      .from(table)
      .select("id, query, project, timestamp, handler_name, success")
      .order("timestamp", { ascending: false })
      .limit(3)
    if (!error) {
      newest = data ?? []
      const { count } = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      last24h = count ?? 0
      break
    }
    newestError = error.message
  }

  let hint: string
  if (write.ok) {
    hint = `Insert succeeded via ${write.path} — refresh analytics with 24h.`
  } else if (write.tableMissing || write.rpcMissing) {
    hint = INSERT_AI_QUERY_LOG_RPC_HINT
  } else {
    hint = write.error
  }

  return NextResponse.json({
    ok: write.ok,
    write,
    deploySha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null,
    last24h,
    newest,
    newestError,
    hint,
  })
}
