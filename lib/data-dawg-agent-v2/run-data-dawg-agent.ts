import { applyRecruitNcDataDawgAnswerPostProcess } from "@/lib/recruitnc-data-dawg-postprocess"
import { getRouteForSuggestedPrompt } from "@/lib/data-dawg-suggested-prompts"
import { formatSuggestedHandlerAnswer } from "@/lib/data-dawg-suggested-handler-answer"
import {
  parseNhscaBestYearScopeFollowUp,
  tryNhscaBestYearScopeClarify,
} from "@/lib/data-dawg-scope-clarify"
import { parseTournamentResultsQuery } from "@/lib/data-dawg-tournament-results-query"
import { answerTournamentResultsQuery } from "./tournament-results-by-year"
import { tryAthleteNameFastPath } from "./athlete-name-fast-path"
import { trySchoolNameFastPath } from "./school-name-fast-path"
import { planDataDawgQuery } from "./query-planner"
import { executePlannedDataDawgQuery } from "./execute-planned-query"
import { runOpenAiDataDawgToolLoop } from "./openai-tool-loop"
import {
  linkableEntitiesFromFacts,
  linkifyKnownEntities,
} from "@/lib/data-dawg-linkify-entities"
import { DATA_DAWG_AGENT_V2_SYSTEM } from "./system-prompt"
import {
  answerNextBluePractice,
  isBluePracticeScheduleQuery,
} from "@/lib/data-dawg-next-blue-practice"
import {
  answerTournamentOfChampionsQuestion,
  isTournamentOfChampionsQuery,
} from "@/lib/data-dawg-toc-info"

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

  // Tournament of Champions page facts should come from the same constants that render
  // the public landing page: weights, venue/location, schedule, awards, officials, mats,
  // GoFan tickets, registration, streaming, coaches lounge, volunteers, and sponsors.
  if (isTournamentOfChampionsQuery(params.message)) {
    try {
      return {
        answer: applyRecruitNcDataDawgAnswerPostProcess(await answerTournamentOfChampionsQuestion(params.message)),
        messageId,
        queryType: "tournament_of_champions_page_facts",
        source: "data_dawg_agent_v2_toc_page",
        toolRounds: 0,
      }
    } catch (e) {
      console.warn("[RecruitNC] Tournament of Champions page facts lookup failed:", e instanceof Error ? e.message : e)
      return {
        answer:
          "I couldn’t load the Tournament of Champions facts right now. Please check the [Tournament of Champions page](/tournament-of-champions) for the latest details.",
        messageId,
        queryType: "tournament_of_champions_page_facts_error",
        source: "data_dawg_agent_v2_toc_page_error",
        toolRounds: 0,
      }
    }
  }

  // Calendar facts should never rely on the model choosing the right data tool.
  if (isBluePracticeScheduleQuery(params.message)) {
    try {
      return {
        answer: await answerNextBluePractice(),
        messageId,
        queryType: "nc_united_blue_practice_calendar",
        source: "data_dawg_agent_v2_calendar",
        toolRounds: 0,
      }
    } catch (e) {
      console.warn("[RecruitNC] Blue practice calendar lookup failed:", e instanceof Error ? e.message : e)
      return {
        answer:
          "I couldn’t load the Blue practice calendar right now. Please check the [NC United calendar](/calendar) for the latest time and location.",
        messageId,
        queryType: "nc_united_blue_practice_calendar_error",
        source: "data_dawg_agent_v2_calendar_error",
        toolRounds: 0,
      }
    }
  }

  // Follow-up to a prior scope clarify (1 = statewide, 2 = school from chat)
  const scopeFollowUp = parseNhscaBestYearScopeFollowUp(params.message, priorMessages)
  if (scopeFollowUp === "statewide") {
    const suggestedRoute = getRouteForSuggestedPrompt("what was our best year for nhsca all-americans?")
    if (suggestedRoute) {
      try {
        const { getHandler, hasHandler } = await import("@/app/api/ai/chat/handlers/index")
        if (hasHandler(suggestedRoute.handler)) {
          const handler = getHandler(suggestedRoute.handler)
          if (handler) {
            const handlerResult = await handler(
              { query: params.message, search: params.message, ...suggestedRoute.params },
              undefined as never,
              params.messageId || null,
            )
            const formatted = formatSuggestedHandlerAnswer(handlerResult ?? {})
            if (formatted?.trim()) {
              return {
                answer: applyRecruitNcDataDawgAnswerPostProcess(formatted),
                messageId,
                queryType: suggestedRoute.handler,
                source: "data_dawg_agent_v2_scope_followup",
                toolRounds: 0,
              }
            }
          }
        }
      } catch (e) {
        console.warn("[RecruitNC] scope follow-up statewide failed:", e instanceof Error ? e.message : e)
      }
    }
  }
  if (scopeFollowUp === "school") {
    const schoolHint =
      priorMessages
        .slice()
        .reverse()
        .map((h) => h.content.match(/\*\*([^*]+)\*\* — that school/i)?.[1])
        .find(Boolean) || null
    if (schoolHint) {
      try {
        const schoolFast = await trySchoolNameFastPath(schoolHint)
        if (schoolFast) {
          const { answer: followUpRaw, toolRounds: followUpRounds } = await runOpenAiDataDawgToolLoop({
            systemPrompt: DATA_DAWG_AGENT_V2_SYSTEM,
            priorMessages,
            userMessage: params.message,
            groundingFacts: JSON.stringify(schoolFast.facts),
          })
          return {
            answer: applyRecruitNcDataDawgAnswerPostProcess(
              linkifyKnownEntities(followUpRaw, linkableEntitiesFromFacts(schoolFast.facts)),
            ),
            messageId,
            queryType: "school_facts",
            source: "data_dawg_agent_v2_scope_followup",
            toolRounds: followUpRounds,
          }
        }
      } catch (e) {
        console.warn("[RecruitNC] scope follow-up school failed:", e instanceof Error ? e.message : e)
      }
    }
  }

  // Mid-chat "our best year" with a school in context → ask statewide vs school (don't assume).
  const scopeClarify = tryNhscaBestYearScopeClarify(params.message, priorMessages)
  if (scopeClarify) {
    return {
      answer: applyRecruitNcDataDawgAnswerPostProcess(scopeClarify.answer),
      messageId,
      queryType: "scope_clarify_nhsca_best_year",
      source: "data_dawg_agent_v2_clarify",
      toolRounds: 0,
    }
  }

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
  // School lookups resolve their facts here, then the model writes the reply from them.
  // The lookup stays deterministic; only the wording is the model's.
  let groundingFacts: string | null = null
  let groundedQueryType: string | null = null
  /** Kept unserialised so we can guarantee the links the model is only asked to write. */
  let groundedEntities: ReturnType<typeof linkableEntitiesFromFacts> = []
  try {
    const schoolFast = await trySchoolNameFastPath(params.message)
    if (schoolFast) {
      groundingFacts = JSON.stringify(schoolFast.facts)
      groundedQueryType = "school_facts"
      groundedEntities = linkableEntitiesFromFacts(schoolFast.facts)
    }
  } catch (e) {
    console.warn("[RecruitNC] school name fast-path failed:", e instanceof Error ? e.message : e)
  }

  // Athlete lookups resolve their facts here, then the model writes the reply from them.
  // The lookup is still deterministic; only the wording is the model's.
  try {
    const athleteFast = groundingFacts ? null : await tryAthleteNameFastPath(params.message)
    if (athleteFast) {
      groundingFacts = JSON.stringify(athleteFast.facts)
      groundedEntities = linkableEntitiesFromFacts(athleteFast.facts)
      groundedQueryType =
        athleteFast.kind === "directory" ? "athlete_facts_directory" : "athlete_facts_historical"
    }
  } catch (e) {
    console.warn("[RecruitNC] athlete name fast-path failed:", e instanceof Error ? e.message : e)
  }

  // Data Dawg 2.0 planner: deterministic intents → SQL tools (no LLM tool pick).
  // Runs after name/school fast paths so "Mac Johnson" stays a dossier, not a false positive.
  try {
    const plan = groundingFacts ? null : planDataDawgQuery(params.message)
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
    groundingFacts,
  })

  const answer = applyRecruitNcDataDawgAnswerPostProcess(
    linkifyKnownEntities(raw, groundedEntities),
  )

  return {
    answer,
    messageId,
    queryType: groundedQueryType ?? "data_dawg_agent_v2",
    source: groundingFacts ? "data_dawg_agent_v2_grounded" : "data_dawg_agent_v2",
    toolRounds,
  }
}
