/**
 * Write helpers for `ai_query_logs`. Always await these from API routes —
 * fire-and-forget (`void write…`) is dropped by Vercel when the response returns.
 *
 * Prefer RPC `insert_ai_query_log` (plain SQL INSERT). PostgREST table POST can still
 * emit Prefer: resolution=* → ON CONFLICT against a PARTIAL unique index and fail with 42P10.
 */

import { randomUUID } from "crypto"
import {
  computeAiQuerySuccess,
  isAiQueryLogsTableMissingError,
  truncateAiResponse,
  type AiQueryLogInsert,
} from "@/lib/ai-query-logs"

export type WriteAiQueryLogResult =
  | { ok: true; id: string }
  | { ok: false; tableMissing?: boolean; error: string }

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

  const messageId = entry.message_id?.trim() || null

  return {
    query: entry.query,
    project: entry.project ?? "recruit-nc",
    url: entry.url ?? null,
    response: truncateAiResponse(entry.response),
    query_type: entry.query_type ?? null,
    response_time_ms: entry.response_time_ms ?? null,
    feedback: entry.feedback ?? null,
    message_id: messageId,
    error_message: entry.error_message?.trim() || null,
    handler_name: entry.handler_name ?? null,
    success,
  }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "")
  let message = text || `HTTP ${res.status}`
  try {
    const j = JSON.parse(text) as { message?: string; error?: string; hint?: string; details?: string }
    message = j.message || j.error || message
    if (j.hint) message = `${message} (${j.hint})`
    if (j.details) message = `${message} [${j.details}]`
  } catch {
    /* keep text */
  }
  return message
}

/** Plain SQL INSERT via security definer RPC — no PostgREST ON CONFLICT. */
async function rpcInsert(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const res = await fetch(`${cfg.url}/rest/v1/rpc/insert_ai_query_log`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
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
    return { ok: false, status: res.status, error: await parseError(res) }
  }

  const body = await res.text().catch(() => "")
  // PostgREST returns a JSON string UUID (quoted) or bare uuid
  let id = body.trim()
  try {
    const parsed = JSON.parse(body) as unknown
    if (typeof parsed === "string") id = parsed
  } catch {
    id = id.replace(/^"|"$/g, "")
  }
  if (!id || id.length < 8) id = randomUUID()
  return { ok: true, id }
}

/** Fallback table POST — no Prefer header at all (avoids resolution=* / ON CONFLICT). */
async function restInsert(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const id = randomUUID()
  const now = new Date().toISOString()
  const row = {
    id,
    ...fields,
    timestamp: now,
  }

  const res = await fetch(`${cfg.url}/rest/v1/ai_query_logs`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      // Intentionally omit Prefer entirely
    },
    body: JSON.stringify(row),
  })

  if (res.ok || res.status === 201) return { ok: true, id }
  return { ok: false, status: res.status, error: await parseError(res) }
}

export async function writeAiQueryLog(entry: AiQueryLogInsert): Promise<WriteAiQueryLogResult> {
  try {
    const fields = buildFields(entry)

    // 1) RPC first
    let result = await rpcInsert(fields)

    // 2) If RPC missing, fall back to plain REST insert
    if (
      !result.ok &&
      (/insert_ai_query_log|PGRST202|Could not find the function|404/i.test(result.error) ||
        result.status === 404)
    ) {
      console.warn("[RecruitNC] insert_ai_query_log RPC missing — falling back to REST insert")
      result = await restInsert(fields)

      // Duplicate message_id → retry without it
      if (!result.ok && /duplicate|unique|23505/i.test(result.error) && fields.message_id) {
        result = await restInsert({ ...fields, message_id: null })
      }
    }

    if (!result.ok) {
      if (
        isAiQueryLogsTableMissingError({ message: result.error }) ||
        /does not exist|PGRST205|42P01/i.test(result.error)
      ) {
        console.warn("[RecruitNC] ai_query_logs missing — run scripts/ai-query-logs-table.sql")
        return { ok: false, tableMissing: true, error: result.error }
      }
      console.warn("[RecruitNC] ai_query_logs insert failed:", result.error)
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
