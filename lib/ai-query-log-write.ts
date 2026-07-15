/**
 * Write helpers for `ai_query_logs`.
 *
 * Prefer RPC `write_ai_query_log(jsonb)` — plain INSERT, no ON CONFLICT.
 * Fallback: REST POST with ZERO Prefer headers (Supabase/PostgREST
 * Prefer: resolution=* + a PARTIAL unique on message_id → Postgres 42P10).
 *
 * Never use supabase-js `.insert()` / `.upsert()` for this table.
 */

import { randomUUID } from "crypto"
import {
  computeAiQuerySuccess,
  isAiQueryLogsTableMissingError,
  truncateAiResponse,
  type AiQueryLogInsert,
} from "@/lib/ai-query-logs"

export type WriteAiQueryLogResult =
  | { ok: true; id: string; path: "rpc" | "rest" }
  | { ok: false; tableMissing?: boolean; rpcMissing?: boolean; error: string; pathTried?: string }

export const INSERT_AI_QUERY_LOG_RPC_HINT =
  "Run the FULL scripts/ai-query-logs-on-conflict-fix.sql in Supabase (drops old insert_ai_query_log overloads, creates write_ai_query_log(jsonb), adds UNIQUE(message_id)), then NOTIFY pgrst, 'reload schema'."

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
    const j = JSON.parse(text) as {
      message?: string
      error?: string
      hint?: string
      details?: string
      code?: string
    }
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
    /PGRST202|PGRST203|Could not find the function|write_ai_query_log|insert_ai_query_log|does not exist|schema cache/i.test(
      error,
    )
  )
}

/** Service-role headers — never Prefer: resolution=* */
function serviceHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  }
}

function parseUuidBody(body: string): string | null {
  let id = body.trim()
  try {
    const parsed = JSON.parse(body) as unknown
    if (typeof parsed === "string") id = parsed
  } catch {
    id = id.replace(/^"|"$/g, "")
  }
  return id && id.length >= 8 ? id : null
}

async function rpcWriteJson(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string; rpcMissing?: boolean }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  // New unambiguous RPC — avoids stale insert_ai_query_log overloads that may contain ON CONFLICT
  const res = await fetch(`${cfg.url}/rest/v1/rpc/write_ai_query_log`, {
    method: "POST",
    headers: serviceHeaders(cfg.key),
    body: JSON.stringify({ payload: fields }),
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

  const id = parseUuidBody(await res.text().catch(() => ""))
  if (!id) {
    return { ok: false, status: res.status, error: "write_ai_query_log returned empty id" }
  }
  return { ok: true, id }
}

/** Legacy multi-arg RPC (in case only the old function exists). */
async function rpcInsertLegacy(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string; rpcMissing?: boolean }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const res = await fetch(`${cfg.url}/rest/v1/rpc/insert_ai_query_log`, {
    method: "POST",
    headers: serviceHeaders(cfg.key),
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

  const id = parseUuidBody(await res.text().catch(() => ""))
  if (!id) {
    return { ok: false, status: res.status, error: "insert_ai_query_log returned empty id" }
  }
  return { ok: true, id }
}

/**
 * Table POST with no Prefer header at all.
 * If the API gateway still injects Prefer: resolution=*, UNIQUE(message_id) must exist.
 */
async function restInsert(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const id = randomUUID()
  const row = {
    id,
    ...fields,
    timestamp: new Date().toISOString(),
  }

  const res = await fetch(`${cfg.url}/rest/v1/ai_query_logs`, {
    method: "POST",
    headers: serviceHeaders(cfg.key),
    body: JSON.stringify(row),
  })

  if (res.ok || res.status === 201) return { ok: true, id }
  return { ok: false, status: res.status, error: await parseError(res) }
}

export async function writeAiQueryLog(entry: AiQueryLogInsert): Promise<WriteAiQueryLogResult> {
  try {
    const fields = buildFields(entry)

    let rpc = await rpcWriteJson(fields)
    if (rpc.ok) return { ok: true, id: rpc.id, path: "rpc" }

    // Try legacy multi-arg name if jsonb RPC not deployed yet
    if (rpc.rpcMissing) {
      const legacy = await rpcInsertLegacy(fields)
      if (legacy.ok) return { ok: true, id: legacy.id, path: "rpc" }
      rpc = legacy
    }

    console.warn("[RecruitNC] ai_query_logs RPC failed, trying Prefer-free REST:", rpc.error)

    // Prefer null message_id first when 42P10 — reduces unique-target pressure if gateway upserts
    let rest = await restInsert({ ...fields, message_id: null })
    if (!rest.ok && fields.message_id && !/42P10|ON CONFLICT/i.test(rest.error)) {
      rest = await restInsert(fields)
    }
    if (!rest.ok && /duplicate|unique|23505/i.test(rest.error)) {
      rest = await restInsert({ ...fields, message_id: null })
    }

    if (rest.ok) return { ok: true, id: rest.id, path: "rest" }

    if (
      isAiQueryLogsTableMissingError({ message: rest.error }) ||
      /does not exist|PGRST205|42P01/i.test(rest.error)
    ) {
      return { ok: false, tableMissing: true, error: rest.error, pathTried: "rpc+rest" }
    }

    const combined = `rpc: ${rpc.error} | rest: ${rest.error}`
    if (/42P10|ON CONFLICT/i.test(combined)) {
      return {
        ok: false,
        error: `${combined} — ${INSERT_AI_QUERY_LOG_RPC_HINT}`,
        pathTried: "rpc+rest",
      }
    }
    if (rpc.rpcMissing) {
      return {
        ok: false,
        rpcMissing: true,
        error: `${combined} — ${INSERT_AI_QUERY_LOG_RPC_HINT}`,
        pathTried: "rpc+rest",
      }
    }
    return { ok: false, error: combined, pathTried: "rpc+rest" }
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
        headers: serviceHeaders(cfg.key),
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
