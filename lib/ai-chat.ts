/**
 * Unified chat: Claude (Anthropic) or OpenAI.
 * Set ANTHROPIC_API_KEY to use Claude (no OpenAI quota issues). Else uses OPENAI_API_KEY.
 * All callers get the same response shape: { choices: [{ message: { content: string } }] }
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const CHAT_TIMEOUT_MS = 12000

const USE_CLAUDE = !!ANTHROPIC_API_KEY

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }
export type ChatBody = {
  model?: string
  messages: ChatMessage[]
  max_tokens?: number
  temperature?: number
  response_format?: { type: "json_object" }
}

export type ChatResponse = { choices: Array<{ message: { content: string } }> }

function getChatKey(): string {
  if (USE_CLAUDE && ANTHROPIC_API_KEY) return ANTHROPIC_API_KEY
  if (OPENAI_API_KEY) return OPENAI_API_KEY
  throw new Error("No chat API key: set ANTHROPIC_API_KEY or OPENAI_API_KEY")
}

/** Call Claude (Anthropic) or OpenAI; returns OpenAI-shaped response. */
export async function callChat(body: ChatBody): Promise<ChatResponse> {
  const key = getChatKey()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

  try {
    if (USE_CLAUDE && ANTHROPIC_API_KEY) {
      return await callClaude(ANTHROPIC_API_KEY, body, controller.signal)
    }
    return await callOpenAI(OPENAI_API_KEY!, body, controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

async function callClaude(
  apiKey: string,
  body: ChatBody,
  signal: AbortSignal
): Promise<ChatResponse> {
  const messages = body.messages
  let system = ""
  const claudeMessages: { role: "user" | "assistant"; content: string }[] = []
  for (const m of messages) {
    if (m.role === "system") {
      system += (system ? "\n\n" : "") + m.content
    } else if (m.role === "user" || m.role === "assistant") {
      claudeMessages.push({ role: m.role, content: m.content })
    }
  }
  const needsJson = body.response_format?.type === "json_object"
  if (needsJson && claudeMessages.length > 0) {
    const last = claudeMessages[claudeMessages.length - 1]
    if (last.role === "user") {
      last.content =
        last.content +
        "\n\nRespond with valid JSON only, no other text or markdown."
    }
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: body.model || "claude-3-5-haiku-20241022",
      max_tokens: body.max_tokens ?? 4096,
      system: system || undefined,
      messages: claudeMessages,
    }),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Claude API error (status ${res.status}): ${errText || "unknown"}`)
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  let text = data.content?.find((b) => b.type === "text")?.text ?? ""
  if (needsJson && text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) text = jsonMatch[0]
  }
  return { choices: [{ message: { content: text } }] }
}

async function callOpenAI(
  apiKey: string,
  body: ChatBody,
  signal: AbortSignal
): Promise<ChatResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model || "gpt-4o-mini",
      messages: body.messages,
      max_tokens: body.max_tokens ?? 4096,
      temperature: body.temperature ?? 0.1,
      response_format: body.response_format,
    }),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`OpenAI API error (status ${res.status}): ${errText || "unknown"}`)
  }

  return res.json()
}

/** Whether a chat provider is configured (Claude or OpenAI). */
export function hasChatKey(): boolean {
  return !!(ANTHROPIC_API_KEY || OPENAI_API_KEY)
}

/** Which provider is used when both are set. */
export function getChatProvider(): "claude" | "openai" | null {
  if (ANTHROPIC_API_KEY) return "claude"
  if (OPENAI_API_KEY) return "openai"
  return null
}
