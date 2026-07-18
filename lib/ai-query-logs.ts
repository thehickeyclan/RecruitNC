/**
 * Shared helpers for Data Dawg / AI query analytics (`ai_query_logs`).
 */

export const AI_QUERY_LOGS_TABLE_SETUP_HINT =
  "Run scripts/ai-query-logs-table.sql in the Supabase SQL Editor, then ask Data Dawg a few questions."

export type AiQueryLogRow = {
  id: string
  query: string
  project: string | null
  url: string | null
  response: string | null
  query_type: string | null
  response_time_ms: number | null
  feedback: string | null
  message_id: string | null
  error_message: string | null
  handler_name: string | null
  success: boolean | null
  timestamp: string
  created_at?: string | null
  user_id?: string | null
  queried_by?: {
    full_name: string | null
    email: string | null
  } | null
}

export type AiQueryLogInsert = {
  query: string
  project?: string | null
  url?: string | null
  response?: string | null
  query_type?: string | null
  response_time_ms?: number | null
  feedback?: string | null
  message_id?: string | null
  error_message?: string | null
  handler_name?: string | null
  success?: boolean | null
  timestamp?: string
  user_id?: string | null
}

export function isAiQueryLogsTableMissingError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const msg = (error.message ?? "").toLowerCase()
  return (
    error.code === "42P01" ||
    (msg.includes("ai_query_logs") && msg.includes("does not exist")) ||
    msg.includes("relation \"public.ai_query_logs\" does not exist") ||
    msg.includes("relation \"ai_query_logs\" does not exist")
  )
}

export function truncateAiResponse(text: unknown, max = 1000): string | null {
  if (text == null) return null
  const s = typeof text === "string" ? text : JSON.stringify(text)
  const trimmed = s.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

export function computeAiQuerySuccess(opts: {
  answer?: unknown
  errorMessage?: string | null
}): boolean {
  const hasError = Boolean(opts.errorMessage?.trim())
  const answerText =
    typeof opts.answer === "string"
      ? opts.answer
      : opts.answer != null
        ? JSON.stringify(opts.answer)
        : ""
  const hasAnswer = answerText.trim().length > 0
  return hasAnswer && !hasError
}

/** Handlers / paths that indicate fallback / learning candidates. */
export function isLearningOpportunityHandler(handlerName: string | null | undefined): boolean {
  const h = (handlerName ?? "").trim().toLowerCase()
  if (!h) return true
  return (
    h === "llm_fallback" ||
    h.includes("fallback") ||
    h.endsWith("_error") ||
    h.includes("error")
  )
}
