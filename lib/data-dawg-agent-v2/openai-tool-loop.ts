/**
 * OpenAI Chat Completions tool loop (no SDK — matches repo style).
 * Requires OPENAI_API_KEY; Anthropic-only setups should not enable v2.
 */

import { formatOpenAiHttpError } from "@/lib/openai-user-facing-error"
import { DATA_DAWG_AGENT_TOOLS } from "./tool-definitions"
import { executeDataTool } from "./execute-data-tools"
import { extractVerbatimToolMarkdown } from "./verbatim-tool-markdown"

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
  /**
   * Facts a deterministic path already looked up for this question. Saves the model the round
   * trip and — more importantly — keeps it answering from verified rows rather than memory.
   */
  groundingFacts?: string | null
}): Promise<{ answer: string; toolRounds: number; finishReason: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for Data Dawg Agent v2 (tool calling).")
  }

  const model = options.model || process.env.DATA_DAWG_AGENT_MODEL || "gpt-4o-mini"
  const grounding = options.groundingFacts?.trim()
  const messages: ChatMessage[] = [
    { role: "system", content: options.systemPrompt },
    ...options.priorMessages.map((m) => ({ role: m.role, content: m.content })),
    ...(grounding
      ? [
          {
            role: "system" as const,
            content:
              "Already looked up for this question — these are verified rows from our database. " +
              "Answer from them and do not call a tool for this athlete. Every number and result " +
              "in your reply must appear below; if something is not here, we do not have it.\n\n" +
              grounding,
          },
        ]
      : []),
    { role: "user", content: options.userMessage },
  ]

  let toolRounds = 0
  let lastFinishReason = "unknown"
  /** Verbatim tool markdown (athlete/school dossier) — skip rewrite rounds. */
  let forcedDossierMarkdown: string | null = null

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
      throw new Error(formatOpenAiHttpError(res.status, raw))
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

      const toolResults = await Promise.all(
        msg.tool_calls.map(async (tc) => {
          if (tc.type !== "function" || !tc.function?.name) {
            return { tc, name: "", result: JSON.stringify({ error: "invalid tool call" }) }
          }
          const name = tc.function.name
          const argsStr = tc.function.arguments || "{}"
          const result = await executeDataTool(name, argsStr)
          return { tc, name, result }
        }),
      )

      for (const { tc, name, result } of toolResults) {
        const verbatim = extractVerbatimToolMarkdown(name, result)
        if (verbatim) {
          forcedDossierMarkdown = verbatim
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        })
      }

      // Authoritative dossier markdown is the user answer — no more OpenAI rounds.
      if (forcedDossierMarkdown) {
        return {
          answer: forcedDossierMarkdown,
          toolRounds,
          finishReason: "dossier_ready",
        }
      }
      continue
    }

    const text = (msg.content || "").trim()
    if (forcedDossierMarkdown) {
      return { answer: forcedDossierMarkdown, toolRounds, finishReason: finish }
    }
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
