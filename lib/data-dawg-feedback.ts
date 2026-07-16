export const DATA_DAWG_FEEDBACK_STATUSES = ["pending", "approved", "dismissed"] as const

export type DataDawgFeedbackStatus = (typeof DATA_DAWG_FEEDBACK_STATUSES)[number]

export type DataDawgFeedbackRow = {
  id: string
  status: DataDawgFeedbackStatus
  user_query: string | null
  assistant_response: string | null
  message_id: string | null
  correction_notes: string
  submitter_name: string | null
  submitter_email: string | null
  page_url: string | null
  source: string | null
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export const DATA_DAWG_FEEDBACK_STATUS_LABELS: Record<DataDawgFeedbackStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  dismissed: "Dismissed",
}

export function isDataDawgFeedbackTableMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? "").toLowerCase()
  const code = error.code ?? ""
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  )
}

export function isDataDawgFeedbackRlsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? "").toLowerCase()
  const code = error.code ?? ""
  return code === "42501" || msg.includes("row-level security") || msg.includes("row level security")
}

export const DATA_DAWG_FEEDBACK_TABLE_SETUP_HINT =
  "Feedback storage is not set up yet. Admin: run scripts/data-dawg-feedback.sql in Supabase SQL Editor, then retry."

export const DATA_DAWG_FEEDBACK_RLS_SETUP_HINT =
  "Feedback table RLS is blocking saves. Admin: run scripts/data-dawg-feedback-rls-fix.sql in Supabase SQL Editor, then retry."

export function isDataDawgFeedbackStatus(value: string): value is DataDawgFeedbackStatus {
  return (DATA_DAWG_FEEDBACK_STATUSES as readonly string[]).includes(value)
}

const HEY_DATA_DAWG_LEAD = /^hey\s*,?\s*data\s*dawg\b/i

/** Openers that never start a correction — "who won 4A at 132?", "show me Cam Stinson". */
const QUESTION_LEAD =
  /^(who|what|whats|what's|when|where|why|how|hows|how's|which|whose|whom|is|are|was|were|do|does|did|can|could|will|would|show|list|find|tell|give|get|search|look|compare|rank|pull|display)\b/i

/** Phrases that mark a report about wrong/missing data rather than a lookup. */
const CORRECTION_MARKER =
  /\b(not|isn'?t|wasn'?t|aren'?t|weren'?t|didn'?t|doesn'?t|don'?t|should be|should say|should have|shouldn'?t|wrong|incorrect|inaccurate|actually|missing|outdated|out of date|typo|mistake|error|fix|needs? to be|you have|you listed|you said|it says|shows him|shows her|shows them)\b/i

/**
 * Classify the text after a "Hey Data Dawg" greeting. Precedence matters: a leading
 * interrogative wins outright (a correction never opens with "who"/"show"), then any
 * correction marker, then a trailing "?" as a weaker question signal.
 *
 * Returning null means "this is a question" — the caller should send it to the agent.
 */
function isHeyDataDawgQuestion(rest: string): boolean {
  if (QUESTION_LEAD.test(rest)) return true
  if (CORRECTION_MARKER.test(rest)) return false
  return rest.endsWith("?")
}

/** Strip a leading "Hey Data Dawg, …" so fast-path routing sees the bare question. */
export function stripHeyDataDawgGreeting(content: string): string {
  const trimmed = content.trim()
  const match = trimmed.match(HEY_DATA_DAWG_LEAD)
  if (!match) return trimmed
  const rest = trimmed.slice(match[0].length).replace(/^[,:\-–—]\s*/, "").trim()
  return rest || trimmed
}

/**
 * User typed "Hey Data Dawg, …" in chat — extract the correction text after the greeting.
 * Returns null when the text reads as a question, so the caller answers it instead of
 * silently filing it as a data correction.
 */
export function parseHeyDataDawgChatFeedback(content: string): { correctionNotes: string } | { needsDetail: true } | null {
  const trimmed = content.trim()
  const match = trimmed.match(HEY_DATA_DAWG_LEAD)
  if (!match) return null

  const rest = trimmed.slice(match[0].length).replace(/^[,:\-–—]\s*/, "").trim()
  if (rest.length < 5) return { needsDetail: true }
  if (isHeyDataDawgQuestion(rest)) return null
  return { correctionNotes: rest }
}

export type DataDawgFeedbackMessageContext = {
  userQuery: string | null
  assistantResponse: string | null
  messageId?: string
}

/** Last assistant turn in chat — used to attach a spoken "Hey Data Dawg" report to an answer. */
export function findDataDawgFeedbackContextFromMessages(
  messages: Array<{ role: string; content: string; messageId?: string }>,
): DataDawgFeedbackMessageContext | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== "assistant") continue
    let userQuery: string | null = null
    for (let j = i - 1; j >= 0; j--) {
      if (messages[j]?.role === "user") {
        userQuery = messages[j].content
        break
      }
    }
    return {
      userQuery,
      assistantResponse: msg.content,
      messageId: msg.messageId,
    }
  }
  return null
}

export type SubmitDataDawgFeedbackInput = {
  correctionNotes: string
  userQuery?: string | null
  assistantResponse?: string | null
  messageId?: string | null
  submitterName?: string | null
  submitterEmail?: string | null
  pageUrl?: string | null
  source?: string
}

export async function submitDataDawgFeedbackClient(
  input: SubmitDataDawgFeedbackInput,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const res = await fetch("/api/data-dawg/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correctionNotes: input.correctionNotes,
      userQuery: input.userQuery ?? null,
      assistantResponse: input.assistantResponse ?? null,
      messageId: input.messageId ?? null,
      submitterName: input.submitterName ?? null,
      submitterEmail: input.submitterEmail ?? null,
      pageUrl: input.pageUrl ?? (typeof window !== "undefined" ? window.location.href : null),
      source: input.source ?? "data_dawg_widget",
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: typeof data.error === "string" ? data.error : "Could not submit feedback" }
  }
  return {
    ok: true,
    message:
      typeof data.message === "string"
        ? data.message
        : "Thanks — we'll review this and update our data when needed.",
  }
}
