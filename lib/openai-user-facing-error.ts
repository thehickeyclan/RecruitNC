/**
 * Turn OpenAI HTTP error bodies into short, operator-actionable messages (no huge JSON in UI).
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
