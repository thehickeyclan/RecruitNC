/**
 * Turn OpenAI HTTP error bodies into short, operator-actionable messages (no huge JSON in UI).
 *
 * These name env vars and billing URLs — they are for logs and operators only. Never put the
 * return value in a chat bubble; run it through `toDataDawgUserFacingError` first.
 */
export function formatOpenAiHttpError(status: number, rawBody: string): string {
  let code = ""
  let message = ""
  try {
    const j = JSON.parse(rawBody) as { error?: { code?: string; type?: string; message?: string } }
    const err = j?.error
    code = String(err?.code || err?.type || "")
    message = typeof err?.message === "string" ? err.message : ""
  } catch {
    // ignore
  }

  const blob = `${code} ${message} ${rawBody}`.toLowerCase()

  if (blob.includes("insufficient_quota") || message.toLowerCase().includes("exceeded your current quota")) {
    return (
      "The OpenAI API key for this app has no available quota or billing is not active. " +
      "Add credits or a payment method at https://platform.openai.com/account/billing , then redeploy or update OPENAI_API_KEY if you use a new project key."
    )
  }

  if (
    status === 429 &&
    (blob.includes("rate_limit") || code === "rate_limit_exceeded" || message.toLowerCase().includes("rate limit"))
  ) {
    return "OpenAI rate limit reached. Wait a minute and try again, or reduce concurrent Data Dawg usage."
  }

  if (status === 401 || blob.includes("invalid_api_key") || code === "invalid_api_key") {
    return "OpenAI rejected the API key (invalid or revoked). Check OPENAI_API_KEY in Vercel (or .env.local) for this deployment."
  }

  const brief = message.trim() || rawBody.trim().slice(0, 280)
  return `OpenAI request failed (HTTP ${status}). ${brief}`
}

const DATA_DAWG_GENERIC_ERROR =
  "Data Dawg hit a snag on that one. Try again in a moment — if it keeps happening, use the \"something off?\" link to let us know."

const DATA_DAWG_BUSY_ERROR =
  "Data Dawg is getting a lot of questions right now. Give it a minute and ask again."

/**
 * Translate any internal error into something safe for a chat bubble.
 *
 * Operator detail (API keys, env var names, billing URLs, raw exception text) belongs in the
 * query log, not in front of a wrestling parent. Rate limits get their own message because
 * "wait and retry" is genuinely actionable for the user; everything else is our problem.
 */
export function toDataDawgUserFacingError(operatorMessage: string): string {
  const msg = operatorMessage.toLowerCase()
  if (msg.includes("rate limit") || msg.includes("rate_limit")) return DATA_DAWG_BUSY_ERROR
  return DATA_DAWG_GENERIC_ERROR
}
