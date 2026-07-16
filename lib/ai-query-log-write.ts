/**
 * Write helpers for Data Dawg query analytics.
 *
 * Writes to `data_dawg_query_logs` via `write_data_dawg_query_log(jsonb)` —
 * a clean table with PK only (no Prefer/ON CONFLICT traps from legacy
 * `ai_query_logs` partial uniques / stale PostgREST schema cache).
 *
 * Also mirrors into `ai_query_logs` best-effort (never fails the write if mirror fails).
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
  "Run scripts/data-dawg-query-logs-setup.sql in Supabase (creates data_dawg_query_logs + write_data_dawg_query_log), then: NOTIFY pgrst, 'reload schema'."

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

function serviceHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
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

function isRpcMissingError(status: number, error: string): boolean {
  return (
    status === 404 ||
    /PGRST202|PGRST203|Could not find the function|write_data_dawg_query_log|does not exist|schema cache/i.test(
      error,
    )
  )
}

async function rpcWrite(fields: ReturnType<typeof buildFields>): Promise<
  { ok: true; id: string } | { ok: false; status: number; error: string; rpcMissing?: boolean }
> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const res = await fetch(`${cfg.url}/rest/v1/rpc/write_data_dawg_query_log`, {
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
    return { ok: false, status: res.status, error: "write_data_dawg_query_log returned empty id" }
  }
  return { ok: true, id }
}

/** Prefer-free REST insert into the clean table (PK only). */
async function restWrite(fields: ReturnType<typeof buildFields>): Promise<
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

  const res = await fetch(`${cfg.url}/rest/v1/data_dawg_query_logs`, {
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

    const rpc = await rpcWrite(fields)
    if (rpc.ok) return { ok: true, id: rpc.id, path: "rpc" }

    console.warn("[RecruitNC] write_data_dawg_query_log RPC failed, trying REST:", rpc.error)

    const rest = await restWrite({ ...fields, message_id: fields.message_id })
    if (rest.ok) return { ok: true, id: rest.id, path: "rest" }

    if (
      isAiQueryLogsTableMissingError({ message: rest.error }) ||
      /does not exist|PGRST205|42P01/i.test(rest.error) ||
      /data_dawg_query_logs/i.test(rest.error)
    ) {
      return {
        ok: false,
        tableMissing: true,
        rpcMissing: rpc.rpcMissing,
        error: `${rpc.error} | ${rest.error} — ${INSERT_AI_QUERY_LOG_RPC_HINT}`,
        pathTried: "rpc+rest",
      }
    }

    return {
      ok: false,
      rpcMissing: rpc.rpcMissing,
      error: `rpc: ${rpc.error} | rest: ${rest.error}`,
      pathTried: "rpc+rest",
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[RecruitNC] data_dawg_query_logs write failed:", msg)
    return { ok: false, error: msg }
  }
}

/**
 * PATCH one table's row by message_id, returning how many rows actually changed.
 *
 * `Prefer: return=representation` matters: without it PostgREST answers 204 on a zero-row
 * match, so `res.ok` alone reports success for a vote that landed nowhere. (This is the
 * response-shape Prefer, not the `resolution=` upsert one the table comment warns about.)
 */
async function patchFeedbackRows(
  url: string,
  key: string,
  table: string,
  messageId: string,
  feedback: string,
): Promise<{ ok: boolean; rows: number; error?: string }> {
  const res = await fetch(`${url}/rest/v1/${table}?message_id=eq.${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    headers: { ...serviceHeaders(key), Prefer: "return=representation" },
    body: JSON.stringify({ feedback }),
  })
  if (!res.ok) return { ok: false, rows: 0, error: await parseError(res) }

  const text = await res.text().catch(() => "")
  try {
    const parsed = JSON.parse(text) as unknown
    return { ok: true, rows: Array.isArray(parsed) ? parsed.length : 0 }
  } catch {
    return { ok: true, rows: 0 }
  }
}

/** Returns false when no log row matched — the caller must not tell the user it saved. */
export async function updateAiQueryLogFeedback(messageId: string, feedback: string): Promise<boolean> {
  try {
    const cfg = getServiceConfig()
    if ("error" in cfg) return false

    const fresh = await patchFeedbackRows(cfg.url, cfg.key, "data_dawg_query_logs", messageId, feedback)
    if (fresh.rows > 0) return true
    if (!fresh.ok) {
      console.warn("[RecruitNC] query log feedback update failed (new table):", fresh.error)
    }

    // Fall back to the legacy mirror — older rows may only exist there.
    const legacy = await patchFeedbackRows(cfg.url, cfg.key, "ai_query_logs", messageId, feedback)
    if (legacy.rows > 0) return true
    if (!legacy.ok) {
      console.warn("[RecruitNC] query log feedback update failed (legacy table):", legacy.error)
    }

    console.warn("[RecruitNC] query log feedback: no row matched message_id", messageId)
    return false
  } catch (e) {
    console.warn(
      "[RecruitNC] query log feedback update failed:",
      e instanceof Error ? e.message : e,
    )
    return false
  }
}
