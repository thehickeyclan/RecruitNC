import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  AI_QUERY_LOGS_TABLE_SETUP_HINT,
  isAiQueryLogsTableMissingError,
  isLearningOpportunityHandler,
  type AiQueryLogRow,
} from "@/lib/ai-query-logs"

export const dynamic = "force-dynamic"

type TimeRange = "24h" | "7d" | "30d" | "all"

/** Prefer clean table; fall back to legacy ai_query_logs for historical rows. */
const LOG_TABLES = ["data_dawg_query_logs", "ai_query_logs"] as const

const LOG_SELECT =
  "id, query, project, url, response, query_type, response_time_ms, feedback, message_id, error_message, handler_name, success, timestamp"

const SETUP_HINT =
  "Run scripts/data-dawg-query-logs-setup.sql in Supabase, then: NOTIFY pgrst, 'reload schema'."

function cutoffFor(timeRange: TimeRange): string | null {
  if (timeRange === "all") return null
  const now = Date.now()
  const ms =
    timeRange === "24h"
      ? 24 * 60 * 60 * 1000
      : timeRange === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000
  return new Date(now - ms).toISOString()
}

function topCounts(map: Record<string, number>, limit: number) {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

function applyTimeFilter<T extends { gte: (col: string, val: string) => T }>(
  q: T,
  cutoff: string | null,
): T {
  if (!cutoff) return q
  return q.gte("timestamp", cutoff)
}

async function resolveLogTable(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ table: (typeof LOG_TABLES)[number] } | { missing: true }> {
  for (const table of LOG_TABLES) {
    const probe = await admin.from(table).select("id").limit(1)
    if (!probe.error) return { table }
    if (!isAiQueryLogsTableMissingError(probe.error) && !/42P01|does not exist/i.test(probe.error.message)) {
      // unexpected error — treat as hard fail later by probing again
      return { table }
    }
  }
  return { missing: true }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const sp = request.nextUrl.searchParams
  const timeRange = (sp.get("timeRange") as TimeRange) || "all"
  const feedbackFilter = sp.get("feedback") || "all"
  const limitRaw = Number(sp.get("limit") ?? "50")
  const offsetRaw = Number(sp.get("offset") ?? "0")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0
  const sampleLimit = 5000

  const admin = createAdminClient()
  const cutoff = cutoffFor(timeRange)

  const resolved = await resolveLogTable(admin)
  if ("missing" in resolved) {
    return NextResponse.json({
      ok: true,
      tableMissing: true,
      setupHint: SETUP_HINT || AI_QUERY_LOGS_TABLE_SETUP_HINT,
      timeRange,
      summary: null,
      byHandler: [],
      byQueryType: [],
      byProject: [],
      topQueries: [],
      learningOpportunities: [],
      logs: [] as AiQueryLogRow[],
      total: 0,
      allTimeTotal: 0,
      newestTimestamp: null,
      hasMore: false,
    })
  }

  const logTable = resolved.table

  async function countExact(extra?: {
    eq?: [string, string | boolean]
    notNull?: string
    withCutoff?: boolean
  }): Promise<number> {
    let q = admin.from(logTable).select("id", { count: "exact", head: true })
    if (extra?.withCutoff !== false) q = applyTimeFilter(q, cutoff)
    if (extra?.eq) q = q.eq(extra.eq[0], extra.eq[1])
    if (extra?.notNull) q = q.not(extra.notNull, "is", null)
    const { count, error } = await q
    if (error) throw error
    return count ?? 0
  }

  let total = 0
  let allTimeTotal = 0
  let successful = 0
  let failed = 0
  let positiveFeedback = 0
  let negativeFeedback = 0
  let withFeedback = 0
  let newestTimestamp: string | null = null
  try {
    ;[total, allTimeTotal, successful, failed, positiveFeedback, negativeFeedback, withFeedback] =
      await Promise.all([
        countExact(),
        countExact({ withCutoff: false }),
        countExact({ eq: ["success", true] }),
        countExact({ eq: ["success", false] }),
        countExact({ eq: ["feedback", "positive"] }),
        countExact({ eq: ["feedback", "negative"] }),
        countExact({ notNull: "feedback" }),
      ])

    const newestQ = await admin
      .from(logTable)
      .select("timestamp")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!newestQ.error && newestQ.data?.timestamp) {
      newestTimestamp = String(newestQ.data.timestamp)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[RecruitNC] data-dawg analytics counts", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  let sampleQ = admin
    .from(logTable)
    .select(LOG_SELECT)
    .order("timestamp", { ascending: false })
    .limit(sampleLimit)
  sampleQ = applyTimeFilter(sampleQ, cutoff)
  const { data: sampleRaw, error: sampleErr } = await sampleQ

  if (sampleErr) {
    console.error("[RecruitNC] data-dawg analytics sample", sampleErr)
    return NextResponse.json({ error: sampleErr.message }, { status: 500 })
  }

  const sample = (sampleRaw ?? []) as AiQueryLogRow[]

  const byHandler: Record<string, number> = {}
  const byQueryType: Record<string, number> = {}
  const byProject: Record<string, number> = {}
  const queryCounts: Record<string, number> = {}
  const learningCounts: Record<string, number> = {}
  let timeSum = 0
  let timeN = 0

  for (const row of sample) {
    const handler = (row.handler_name || "unknown").trim() || "unknown"
    byHandler[handler] = (byHandler[handler] || 0) + 1

    if (row.query_type) {
      byQueryType[row.query_type] = (byQueryType[row.query_type] || 0) + 1
    }

    const project = (row.project || "unknown").trim() || "unknown"
    byProject[project] = (byProject[project] || 0) + 1

    const qText = row.query.toLowerCase().trim()
    if (qText) queryCounts[qText] = (queryCounts[qText] || 0) + 1

    if (
      isLearningOpportunityHandler(row.handler_name) ||
      row.success === false ||
      Boolean(row.error_message)
    ) {
      if (qText) learningCounts[qText] = (learningCounts[qText] || 0) + 1
    }

    if (typeof row.response_time_ms === "number" && Number.isFinite(row.response_time_ms)) {
      timeSum += row.response_time_ms
      timeN += 1
    }
  }

  let logsQ = admin
    .from(logTable)
    .select(LOG_SELECT, { count: "exact" })
    .order("timestamp", { ascending: false })
  logsQ = applyTimeFilter(logsQ, cutoff)

  if (feedbackFilter === "positive") logsQ = logsQ.eq("feedback", "positive")
  else if (feedbackFilter === "negative") logsQ = logsQ.eq("feedback", "negative")
  else if (feedbackFilter === "with_feedback") logsQ = logsQ.not("feedback", "is", null)
  else if (feedbackFilter === "failed") logsQ = logsQ.eq("success", false)

  const { data: logsRaw, error: logsErr, count: filteredTotal } = await logsQ.range(
    offset,
    offset + limit - 1,
  )

  if (logsErr) {
    console.error("[RecruitNC] data-dawg analytics logs", logsErr)
    return NextResponse.json({ error: logsErr.message }, { status: 500 })
  }

  const logs = (logsRaw ?? []) as AiQueryLogRow[]
  const filtered = filteredTotal ?? logs.length
  const successRate = total > 0 ? (successful / total) * 100 : 0

  return NextResponse.json({
    ok: true,
    tableMissing: false,
    setupHint: null,
    logTable,
    timeRange,
    sampleSize: sample.length,
    sampleCapped: total > sample.length,
    summary: {
      total,
      successful,
      failed,
      successRate,
      avgResponseTimeMs: timeN > 0 ? Math.round(timeSum / timeN) : 0,
      positiveFeedback,
      negativeFeedback,
      withFeedback,
    },
    byHandler: topCounts(byHandler, 15),
    byQueryType: topCounts(byQueryType, 15),
    byProject: topCounts(byProject, 10),
    topQueries: topCounts(queryCounts, 12),
    learningOpportunities: topCounts(learningCounts, 20),
    logs,
    total: filtered,
    allTimeTotal,
    newestTimestamp,
    hasMore: offset + logs.length < filtered,
    offset,
    limit,
  })
}
