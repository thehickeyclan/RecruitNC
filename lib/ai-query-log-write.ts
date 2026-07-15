/**
 * Write helpers for `ai_query_logs`. Always await from API routes —
 * Vercel drops fire-and-forget work after the response returns.
 *
 * Inserts ONLY via RPC `public.insert_ai_query_log` (plain SQL INSERT).
 * Table POST via PostgREST is avoided — Prefer: resolution=* + a PARTIAL unique
 * index on message_id produces: "no unique or exclusion constraint matching
 * the ON CONFLICT specification".
 */

import {
  computeAiQuerySuccess,
  isAiQueryLogsTableMissingError,
  truncateAiResponse,
  type AiQueryLogInsert,
} from "@/lib/ai-query-logs"

export type WriteAiQueryLogResult =
  | { ok: true; id: string }
  | { ok: false; tableMissing?: boolean; rpcMissing?: boolean; error: string }

export const INSERT_AI_QUERY_LOG_RPC_HINT =
  "Run scripts/ai-query-logs-on-conflict-fix.sql in Supabase (creates insert_ai_query_log), then: NOTIFY pgrst, 'reload schema';"

function getServiceConfig(): { url: string; key: string } | { error: string } {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  if (!url) return { error: "SUPABASE_URL missing" }
  if (!key) return { error: "SUPABASE_SERVICE_ROLE_KEY missing" }
  return { url: url.replace(/\/$/, ""), key }
}

function buildFields(entry: AiQueryLogInsert) {
  const success =
    entry.success != null
      ? entry.success
      : computeAiQuerySuccess({
          answer: entry.response,
          errorMessage: entry.error_message,
        })

  return {
    query: entry.query,
    project: entry.project ?? "recruit-nc",
    url: entry.url ?? null,
    response: truncateAiResponse(entry.response),
    query_type: entry.query_type ?? null,
    response_time_ms: entry.response_time_ms ?? null,
    feedback: entry.feedback ?? null,
    message_id: entry.message_id?.trim() || null,
    error_message: entry.error_message?.trim() || null,
    handler_name: entry.handler_name ?? null,
    success,
  }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "")
  let message = text || `HTTP ${res.status}`
  try {
    const j = JSON.parse(text) as { message?: string; error?: string; hint?: string; details?: string; code?: string }
    message = j.message || j.error || message
    if (j.code) message = `${j.code}: ${message}`
    if (j.hint) message = `${message} (${j.hint})`
    if (j.details) message = `${message} [${j.details}]`
  } catch {
    /* keep text */
  }
  return message
}

function isRpcMissingError(status: number, error: string): boolean {
  return (
    status === 404 ||
    /PGRST202|PGRST203|Could not find the function|insert_ai_query_log|does not exist|schema cache/i.test(error)
  )
}

async function rpcInsert(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string; rpcMissing?: boolean }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const res = await fetch(`${cfg.url}/rest/v1/rpc/insert_ai_query_log`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      p_query: fields.query,
      p_project: fields.project,
      p_url: fields.url,
      p_response: fields.response,
      p_query_type: fields.query_type,
      p_response_time_ms: fields.response_time_ms,
      p_feedback: fields.feedback,
      p_message_id: fields.message_id,
      p_error_message: fields.error_message,
      p_handler_name: fields.handler_name,
      p_success: fields.success,
    }),
  })

  if (!res.ok) {
    const error = await parseError(res)
    return {
      ok: false,
      status: res.status,
      error,
      rpcMissing: isRpcMissingError(res.status, error),
    }
  }

  const body = await res.text().catch(() => "")
  let id = body.trim()
  try {
    const parsed = JSON.parse(body) as unknown
    if (typeof parsed === "string") id = parsed
  } catch {
    id = id.replace(/^"|"$/g, "")
  }
  if (!id || id.length < 8) {
    return { ok: false, status: res.status, error: `RPC returned unexpected body: ${body.slice(0, 200)}` }
  }
  return { ok: true, id }
}

export async function writeAiQueryLog(entry: AiQueryLogInsert): Promise<WriteAiQueryLogResult> {
  try {
    const fields = buildFields(entry)
    const result = await rpcInsert(fields)

    if (!result.ok) {
      if (result.rpcMissing) {
        console.warn("[RecruitNC] insert_ai_query_log RPC missing —", INSERT_AI_QUERY_LOG_RPC_HINT)
        return {
          ok: false,
          rpcMissing: true,
          error: `${result.error} — ${INSERT_AI_QUERY_LOG_RPC_HINT}`,
        }
      }
      if (
        isAiQueryLogsTableMissingError({ message: result.error }) ||
        /does not exist|PGRST205|42P01/i.test(result.error)
      ) {
        return { ok: false, tableMissing: true, error: result.error }
      }
      console.warn("[RecruitNC] ai_query_logs RPC insert failed:", result.error)
      return { ok: false, error: result.error }
    }
    return { ok: true, id: result.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[RecruitNC] ai_query_logs write failed:", msg)
    return { ok: false, error: msg }
  }
}

export async function updateAiQueryLogFeedback(messageId: string, feedback: string): Promise<boolean> {
  try {
    const cfg = getServiceConfig()
    if ("error" in cfg) return false

    const res = await fetch(
      `${cfg.url}/rest/v1/ai_query_logs?message_id=eq.${encodeURIComponent(messageId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback }),
      },
    )
    if (!res.ok) {
      console.warn("[RecruitNC] ai_query_logs feedback update failed:", await parseError(res))
      return false
    }
    return true
  } catch (e) {
    console.warn("[RecruitNC] ai_query_logs feedback update failed:", e instanceof Error ? e.message : e)
    return false
  }
}
