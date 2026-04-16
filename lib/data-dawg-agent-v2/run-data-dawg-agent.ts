import { applyRecruitNcDataDawgAnswerPostProcess } from "@/lib/recruitnc-data-dawg-postprocess"
import { runOpenAiDataDawgToolLoop } from "./openai-tool-loop"
import { DATA_DAWG_AGENT_V2_SYSTEM } from "./system-prompt"

type HistoryItem = {
  role?: string
  content?: string
  queryResults?: unknown
  queryType?: string
}

function historyToPriorMessages(history: HistoryItem[] | undefined): Array<{ role: "user" | "assistant"; content: string }> {
  if (!history?.length) return []
  const out: Array<{ role: "user" | "assistant"; content: string }> = []
  for (const h of history) {
    const role = h.role
    if (role !== "user" && role !== "assistant") continue
    let text = typeof h.content === "string" ? h.content : ""
    if (h.queryResults && Array.isArray(h.queryResults) && h.queryResults.length > 0) {
      text += `\n[Previous reply included ${h.queryResults.length} tabular rows; queryType=${h.queryType ?? "unknown"}]`
    }
    if (text.trim()) {
      out.push({ role, content: text.trim() })
    }
  }
  return out.slice(-8)
}

export async function runDataDawgAgentV2(params: {
  message: string
  conversationHistory?: HistoryItem[]
  messageId?: string
}): Promise<{
  answer: string
  messageId: string
  queryType: string
  source: string
  toolRounds: number
}> {
  const priorMessages = historyToPriorMessages(params.conversationHistory)
  const { answer: raw, toolRounds } = await runOpenAiDataDawgToolLoop({
    systemPrompt: DATA_DAWG_AGENT_V2_SYSTEM,
    priorMessages,
    userMessage: params.message,
  })

  const answer = applyRecruitNcDataDawgAnswerPostProcess(raw)

  return {
    answer,
    messageId: params.messageId || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    queryType: "data_dawg_agent_v2",
    source: "data_dawg_agent_v2",
    toolRounds,
  }
}
