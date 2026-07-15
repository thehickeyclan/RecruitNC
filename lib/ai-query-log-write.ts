/**
 * Write helpers for `ai_query_logs`. Always await from API routes —
 * Vercel drops fire-and-forget work after the response returns.
 *
 * Strategy:
 * 1) RPC `insert_ai_query_log` (plain SQL INSERT) — preferred.
 * 2) If RPC missing/fails, REST POST to the table with **no Prefer header**
 *    (supabase-js `.insert()` often sends Prefer: resolution=* which breaks when
 *    only a PARTIAL unique index exists → Postgres 42P10 ON CONFLICT error).
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
  "Run scripts/ai-query-logs-on-conflict-fix.sql in Supabase (creates insert_ai_query_log + UNIQUE(message_id)), then: NOTIFY pgrst, 'reload schema';"

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
    /PGRST202|PGRST203|Could not find the function|insert_ai_query_log|does not exist|schema cache/i.test(
      error,
    )
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
      // Never Prefer: resolution=* on RPC
      Prefer: "return=representation",
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

/**
 * Table POST with no Prefer: resolution. supabase-js `.insert()` is avoided on purpose.
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
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      // Explicit: return only — NEVER resolution=* (causes 42P10 with partial unique indexes)
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  })

  if (res.ok || res.status === 201) return { ok: true, id }
  return { ok: false, status: res.status, error: await parseError(res) }
}

export async function writeAiQueryLog(entry: AiQueryLogInsert): Promise<WriteAiQueryLogResult> {
  try {
    const fields = buildFields(entry)
    const rpc = await rpcInsert(fields)

    if (rpc.ok) return { ok: true, id: rpc.id, path: "rpc" }

    // Fallback when RPC missing from schema cache OR any RPC failure — Prefer-free REST
    console.warn(
      "[RecruitNC] insert_ai_query_log RPC failed, trying Prefer-free REST:",
      rpc.error,
    )
    let rest = await restInsert(fields)

    // Unique message_id collision → retry without it
    if (!rest.ok && /duplicate|unique|23505/i.test(rest.error) && fields.message_id) {
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
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
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
