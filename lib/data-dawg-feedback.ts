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

export function isDataDawgFeedbackStatus(value: string): value is DataDawgFeedbackStatus {
  return (DATA_DAWG_FEEDBACK_STATUSES as readonly string[]).includes(value)
}

const HEY_DATA_DAWG_LEAD = /^hey\s*,?\s*data\s*dawg\b/i

/** User typed "Hey Data Dawg, …" in chat — extract the correction text after the greeting. */
export function parseHeyDataDawgChatFeedback(content: string): { correctionNotes: string } | { needsDetail: true } | null {
  const trimmed = content.trim()
  const match = trimmed.match(HEY_DATA_DAWG_LEAD)
  if (!match) return null

  const rest = trimmed.slice(match[0].length).replace(/^[,:\-–—]\s*/, "").trim()
  if (rest.length < 5) return { needsDetail: true }
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
