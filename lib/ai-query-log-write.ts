/**
 * Write helpers for `ai_query_logs`. Always await these from API routes —
 * fire-and-forget (`void write…`) is dropped by Vercel when the response returns.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import {
  computeAiQuerySuccess,
  isAiQueryLogsTableMissingError,
  truncateAiResponse,
  type AiQueryLogInsert,
} from "@/lib/ai-query-logs"

export type WriteAiQueryLogResult =
  | { ok: true }
  | { ok: false; tableMissing?: boolean; error: string }

export async function writeAiQueryLog(entry: AiQueryLogInsert): Promise<WriteAiQueryLogResult> {
  try {
    const admin = createAdminClient()
    const success =
      entry.success != null
        ? entry.success
        : computeAiQuerySuccess({
            answer: entry.response,
            errorMessage: entry.error_message,
          })

    const { error } = await admin.from("ai_query_logs").insert({
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
      timestamp: entry.timestamp ?? new Date().toISOString(),
    })

    if (error) {
      if (isAiQueryLogsTableMissingError(error)) {
        console.warn("[RecruitNC] ai_query_logs missing — run scripts/ai-query-logs-table.sql")
        return { ok: false, tableMissing: true, error: error.message }
      }
      console.warn("[RecruitNC] ai_query_logs insert failed:", error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn("[RecruitNC] ai_query_logs write failed:", msg)
    return { ok: false, error: msg }
  }
}

export async function updateAiQueryLogFeedback(messageId: string, feedback: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("ai_query_logs")
      .update({ feedback })
      .eq("message_id", messageId)
      .select("id")

    if (error) {
      if (isAiQueryLogsTableMissingError(error)) return false
      console.warn("[RecruitNC] ai_query_logs feedback update failed:", error.message)
      return false
    }
    return Boolean(data?.length)
  } catch (e) {
    console.warn("[RecruitNC] ai_query_logs feedback update failed:", e instanceof Error ? e.message : e)
    return false
  }
}
