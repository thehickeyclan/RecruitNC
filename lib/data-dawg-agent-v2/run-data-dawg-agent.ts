import { applyRecruitNcDataDawgAnswerPostProcess } from "@/lib/recruitnc-data-dawg-postprocess"
import { getRouteForSuggestedPrompt } from "@/lib/data-dawg-suggested-prompts"
import { formatSuggestedHandlerAnswer } from "@/lib/data-dawg-suggested-handler-answer"
import { parseTournamentResultsQuery } from "@/lib/data-dawg-tournament-results-query"
import { answerTournamentResultsQuery } from "./tournament-results-by-year"
import { tryAthleteNameFastPath } from "./athlete-name-fast-path"
import { trySchoolNameFastPath } from "./school-name-fast-path"
import { planDataDawgQuery } from "./query-planner"
import { executePlannedDataDawgQuery } from "./execute-planned-query"
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
  const messageId = params.messageId || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  // Chip / FAQ examples must hit deterministic handlers — agent v2 was treating
  // "which school has the most NHSCA All-Americans?" as a school named "North Carolina".
  const suggestedRoute = getRouteForSuggestedPrompt(params.message)
  if (suggestedRoute) {
    try {
      const { getHandler, hasHandler } = await import("@/app/api/ai/chat/handlers/index")
      if (hasHandler(suggestedRoute.handler)) {
        const handler = getHandler(suggestedRoute.handler)
        if (handler) {
          const handlerResult = await handler(
            { query: params.message, search: params.message, ...suggestedRoute.params },
            // Handlers that ignore request still type as NextRequest
            undefined as never,
            params.messageId || null,
          )
          if (handlerResult?.directResponse) {
            const data = (await handlerResult.directResponse.clone().json().catch(() => null)) as {
              answer?: string
            } | null
            if (data?.answer) {
              return {
                answer: applyRecruitNcDataDawgAnswerPostProcess(String(data.answer)),
                messageId,
                queryType: suggestedRoute.handler,
                source: "data_dawg_agent_v2_suggested",
                toolRounds: 0,
              }
            }
          }
          const formatted = formatSuggestedHandlerAnswer(handlerResult ?? {})
          if (formatted?.trim()) {
            return {
              answer: applyRecruitNcDataDawgAnswerPostProcess(formatted),
              messageId,
              queryType: suggestedRoute.handler,
              source: "data_dawg_agent_v2_suggested",
              toolRounds: 0,
            }
          }
        }
      }
    } catch (e) {
      console.warn("[RecruitNC] suggested-prompt pre-route failed:", e instanceof Error ? e.message : e)
    }
  }

  const tournamentParsed = parseTournamentResultsQuery(params.message)
  if (tournamentParsed) {
    try {
      const { answer: directAnswer } = await answerTournamentResultsQuery(tournamentParsed)
      const answer = applyRecruitNcDataDawgAnswerPostProcess(directAnswer)
      return {
        answer,
        messageId,
        queryType: `tournament_results_${tournamentParsed.kind}`,
        source: "data_dawg_agent_v2",
        toolRounds: 0,
      }
    } catch (e) {
      console.warn("[RecruitNC] tournament results pre-route failed:", e instanceof Error ? e.message : e)
    }
  }

  // Deterministic dossiers: school + athlete name — no OpenAI when match is clear.
  // Run even mid-conversation: "Cardinal Gibbons" then "Kevin O'Brien" must still fast-path;
  // follow-ups like "tell me more" fail the lookalike heuristics and fall through.
  try {
    const schoolFast = await trySchoolNameFastPath(params.message)
    if (schoolFast?.markdown) {
      return {
        answer: applyRecruitNcDataDawgAnswerPostProcess(schoolFast.markdown),
        messageId,
        queryType: "school_name_fast_path",
        source: "data_dawg_agent_v2_fast",
        toolRounds: 0,
      }
    }
  } catch (e) {
    console.warn("[RecruitNC] school name fast-path failed:", e instanceof Error ? e.message : e)
  }

  try {
    const athleteFast = await tryAthleteNameFastPath(params.message)
    if (athleteFast?.markdown) {
      return {
        answer: applyRecruitNcDataDawgAnswerPostProcess(athleteFast.markdown),
        messageId,
        queryType: "athlete_name_fast_path",
        source: "data_dawg_agent_v2_fast",
        toolRounds: 0,
      }
    }
  } catch (e) {
    console.warn("[RecruitNC] athlete name fast-path failed:", e instanceof Error ? e.message : e)
  }

  // Data Dawg 2.0 planner: deterministic intents → SQL tools (no LLM tool pick).
  // Runs after name/school fast paths so "Mac Johnson" stays a dossier, not a false positive.
  try {
    const plan = planDataDawgQuery(params.message)
    if (plan) {
      const planned = await executePlannedDataDawgQuery(plan)
      if (planned?.answer) {
        return {
          answer: applyRecruitNcDataDawgAnswerPostProcess(planned.answer),
          messageId,
          queryType: planned.queryType,
          source: "data_dawg_agent_v2_planner",
          toolRounds: 0,
        }
      }
    }
  } catch (e) {
    console.warn("[RecruitNC] query planner failed:", e instanceof Error ? e.message : e)
  }

  const { answer: raw, toolRounds } = await runOpenAiDataDawgToolLoop({
    systemPrompt: DATA_DAWG_AGENT_V2_SYSTEM,
    priorMessages,
    userMessage: params.message,
  })

  const answer = applyRecruitNcDataDawgAnswerPostProcess(raw)

  return {
    answer,
    messageId,
    queryType: "data_dawg_agent_v2",
    source: "data_dawg_agent_v2",
    toolRounds,
  }
}
