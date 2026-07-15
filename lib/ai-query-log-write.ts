/**
 * Write helpers for `ai_query_logs`. Always await these from API routes —
 * fire-and-forget (`void write…`) is dropped by Vercel when the response returns.
 *
 * Avoid supabase-js `.upsert()` Prefer: resolution=* when the table lacks a matching
 * unique constraint — that surfaces as 42P10 ON CONFLICT errors and stops analytics.
 * New rows always carry an explicit `id` and are inserted via REST with Prefer: return=minimal.
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

function buildRow(entry: AiQueryLogInsert) {
  const success =
    entry.success != null
      ? entry.success
      : computeAiQuerySuccess({
          answer: entry.response,
          errorMessage: entry.error_message,
        })

  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    query: entry.query,
    project: entry.project ?? "recruit-nc",
    url: entry.url ?? null,
    response: truncateAiResponse(entry.response),
    query_type: entry.query_type ?? null,
    response_time_ms: entry.response_time_ms ?? null,
    feedback: entry.feedback ?? null,
    message_id: entry.message_id ?? null,
    error_message: entry.error_message?.trim() || null,
    handler_name: entry.handler_name ?? null,
    success,
    timestamp: entry.timestamp ?? now,
    created_at: now,
  }
}

async function restInsert(row: Record<string, unknown>): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const cfg = getServiceConfig()
  if ("error" in cfg) return { ok: false, status: 0, error: cfg.error }

  const res = await fetch(`${cfg.url}/rest/v1/ai_query_logs`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      // Critical: do NOT send Prefer: resolution=ignore-duplicates (needs ON CONFLICT target)
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  })

  if (res.ok || res.status === 201) return { ok: true }

  const text = await res.text().catch(() => "")
  let message = text || `HTTP ${res.status}`
  try {
    const j = JSON.parse(text) as { message?: string; error?: string; hint?: string }
    message = j.message || j.error || message
    if (j.hint) message = `${message} (${j.hint})`
  } catch {
    /* keep text */
  }
  return { ok: false, status: res.status, error: message }
}

export async function writeAiQueryLog(entry: AiQueryLogInsert): Promise<WriteAiQueryLogResult> {
  try {
    const row = buildRow(entry)

    let result = await restInsert(row)

    // Unique message_id collision or Prefer ghosts → retry without message_id
    if (!result.ok && /ON CONFLICT|duplicate|unique/i.test(result.error) && row.message_id) {
      const { message_id: _m, created_at: _c, ...withoutMessageId } = row
      result = await restInsert({ ...withoutMessageId, id: randomUUID(), timestamp: new Date().toISOString() })
    }

    // Table may lack created_at — retry without it
    if (!result.ok && /created_at/i.test(result.error)) {
      const { created_at: _c, ...withoutCreated } = row
      result = await restInsert({ ...withoutCreated, id: randomUUID(), timestamp: new Date().toISOString() })
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
    return { ok: true, id: String(row.id) }
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
      const text = await res.text().catch(() => "")
      console.warn("[RecruitNC] ai_query_logs feedback update failed:", text || res.status)
      return false
    }
    return true
  } catch (e) {
    console.warn("[RecruitNC] ai_query_logs feedback update failed:", e instanceof Error ? e.message : e)
    return false
  }
}
