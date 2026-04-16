/**
 * OpenAI Chat Completions tool loop (no SDK — matches repo style).
 * Requires OPENAI_API_KEY; Anthropic-only setups should not enable v2.
 */

import { DATA_DAWG_AGENT_TOOLS } from "./tool-definitions"
import { executeDataTool } from "./execute-data-tools"

const OPENAI_URL = "https://api.openai.com/v1/chat/completions"
const LOOP_TIMEOUT_MS = 90_000
const MAX_ROUNDS = 6

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

type ToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export async function runOpenAiDataDawgToolLoop(options: {
  systemPrompt: string
  /** Prior turns (user/assistant text only is fine). */
  priorMessages: Array<{ role: "user" | "assistant"; content: string }>
  userMessage: string
  model?: string
}): Promise<{ answer: string; toolRounds: number; finishReason: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for Data Dawg Agent v2 (tool calling).")
  }

  const model = options.model || process.env.DATA_DAWG_AGENT_MODEL || "gpt-4o-mini"
  const messages: ChatMessage[] = [
    { role: "system", content: options.systemPrompt },
    ...options.priorMessages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: options.userMessage },
  ]

  let toolRounds = 0
  let lastFinishReason = "unknown"

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LOOP_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: DATA_DAWG_AGENT_TOOLS,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    const raw = await res.text()
    if (!res.ok) {
      throw new Error(`OpenAI error (${res.status}): ${raw.slice(0, 800)}`)
    }

    let data: {
      choices?: Array<{
        finish_reason?: string
        message?: {
          role?: string
          content?: string | null
          tool_calls?: ToolCall[]
        }
      }>
    }
    try {
      data = JSON.parse(raw) as typeof data
    } catch {
      throw new Error("OpenAI returned non-JSON")
    }

    const choice = data.choices?.[0]
    const finish = choice?.finish_reason || "stop"
    lastFinishReason = finish
    const msg = choice?.message

    if (!msg) {
      throw new Error("OpenAI returned no message")
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      toolRounds += 1
      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      })

      for (const tc of msg.tool_calls) {
        if (tc.type !== "function" || !tc.function?.name) continue
        const name = tc.function.name
        let argsStr = tc.function.arguments || "{}"
        const result = await executeDataTool(name, argsStr)
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        })
      }
      continue
    }

    const text = (msg.content || "").trim()
    if (text.length > 0) {
      return { answer: text, toolRounds, finishReason: finish }
    }

    if (finish === "length") {
      return {
        answer:
          "The response was cut off (token limit). Please ask a narrower question or try again.",
        toolRounds,
        finishReason: finish,
      }
    }

    break
  }

  return {
    answer:
      "I could not complete that request after several tool attempts. Try a shorter or more specific question.",
    toolRounds,
    finishReason: lastFinishReason,
  }
}
