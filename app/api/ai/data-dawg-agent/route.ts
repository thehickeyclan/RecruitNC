import { NextRequest, NextResponse } from "next/server"
import { runDataDawgAgentV2 } from "@/lib/data-dawg-agent-v2/run-data-dawg-agent"
import { writeAiQueryLog } from "@/lib/ai-query-log-write"
import { computeAiQuerySuccess } from "@/lib/ai-query-logs"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const started = Date.now()
  let message = ""
  let project = "recruit-nc"
  let messageId: string | undefined

  try {
    const body = await req.json().catch(() => ({}))
    message = typeof body.message === "string" ? body.message.trim() : ""
    const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : undefined
    messageId = typeof body.messageId === "string" ? body.messageId : undefined
    project =
      typeof body.project === "string" && body.project.trim()
        ? body.project.trim()
        : "recruit-nc"
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : ""

    // Thumbs feedback only (same pattern as /api/ai/chat)
    if (!message && feedback && messageId) {
      const { updateAiQueryLogFeedback } = await import("@/lib/ai-query-log-write")
      const ok = await updateAiQueryLogFeedback(messageId, feedback)
      return NextResponse.json(
        { success: ok, error: ok ? undefined : "Log entry not found" },
        { status: ok ? 200 : 404 },
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: "message is required", answer: "Send a non-empty message." },
        { status: 400 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      const answer =
        "Data Dawg Agent v2 requires OpenAI (OPENAI_API_KEY). Use the standard Data Dawg endpoint or add OPENAI_API_KEY for this mode."
      void writeAiQueryLog({
        query: message,
        project,
        url: req.url,
        response: answer,
        query_type: "data_dawg_agent_v2_config",
        handler_name: "data_dawg_agent_v2_config",
        message_id: messageId ?? null,
        response_time_ms: Date.now() - started,
        success: false,
        error_message: "OPENAI_API_KEY missing",
      })
      return NextResponse.json({
        answer,
        queryType: "data_dawg_agent_v2_config",
        source: "data_dawg_agent_v2",
        messageId: messageId ?? undefined,
      })
    }

    const result = await runDataDawgAgentV2({
      message,
      conversationHistory,
      messageId,
    })

    const responseTimeMs = Date.now() - started
    const success = computeAiQuerySuccess({ answer: result.answer })

    void writeAiQueryLog({
      query: message,
      project,
      url: req.url,
      response: result.answer,
      query_type: result.queryType,
      handler_name: result.source,
      message_id: result.messageId,
      response_time_ms: responseTimeMs,
      success,
    })

    return NextResponse.json({
      answer: result.answer,
      messageId: result.messageId,
      queryType: result.queryType,
      source: result.source,
      toolRounds: result.toolRounds,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[data-dawg-agent]", msg)
    const answer =
      msg.startsWith("The OpenAI API key") ||
      msg.startsWith("OpenAI rate limit") ||
      msg.startsWith("OpenAI rejected") ||
      msg.startsWith("OpenAI request failed")
        ? msg
        : `Data Dawg hit an error: ${msg}`

    if (message) {
      void writeAiQueryLog({
        query: message,
        project,
        url: req.url,
        response: answer,
        query_type: "data_dawg_agent_v2_error",
        handler_name: "data_dawg_agent_v2_error",
        message_id: messageId ?? null,
        response_time_ms: Date.now() - started,
        success: false,
        error_message: msg,
      })
    }

    return NextResponse.json(
      {
        answer,
        queryType: "data_dawg_agent_v2_error",
        source: "data_dawg_agent_v2",
        error: msg,
        messageId: messageId ?? undefined,
      },
      { status: 200 },
    )
  }
}
