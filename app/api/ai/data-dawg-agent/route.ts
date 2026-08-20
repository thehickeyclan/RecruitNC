import { NextRequest, NextResponse } from "next/server"
import { runDataDawgAgentV2 } from "@/lib/data-dawg-agent-v2/run-data-dawg-agent"
import { writeAiQueryLog } from "@/lib/ai-query-log-write"
import { computeAiQuerySuccess } from "@/lib/ai-query-logs"
import { toDataDawgUserFacingError } from "@/lib/openai-user-facing-error"
import { resolveDataDawgRequestUserId } from "@/lib/data-dawg-request-user"
import {
  checkDataDawgRateLimit,
  clampConversationHistory,
  rateLimitKey,
  DATA_DAWG_MAX_MESSAGE_CHARS,
} from "@/lib/data-dawg-rate-limit"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const started = Date.now()
  let message = ""
  let project = "recruit-nc"
  let messageId: string | undefined
  let userId: string | null = null

  try {
    const body = await req.json().catch(() => ({}))
    message = typeof body.message === "string" ? body.message.trim() : ""
    const conversationHistory = clampConversationHistory(body.conversationHistory)
    messageId = typeof body.messageId === "string" ? body.messageId : undefined
    project =
      typeof body.project === "string" && body.project.trim()
        ? body.project.trim()
        : "recruit-nc"
    const feedback = typeof body.feedback === "string" ? body.feedback.trim() : ""

    userId = await resolveDataDawgRequestUserId(req)

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

    if (message.length > DATA_DAWG_MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        {
          answer: "That question is too long for me. Try asking it in a sentence or two.",
          queryType: "data_dawg_agent_v2_too_long",
          source: "data_dawg_agent_v2",
        },
        { status: 400 },
      )
    }

    // Public endpoint calling a paid model — see lib/data-dawg-rate-limit.ts.
    const limit = checkDataDawgRateLimit(
      rateLimitKey({
        userId,
        forwardedFor: req.headers.get("x-forwarded-for"),
        realIp: req.headers.get("x-real-ip"),
      }),
    )
    if (!limit.allowed) {
      return NextResponse.json(
        {
          answer: "I am getting a lot of questions right now — give me a moment and ask again.",
          queryType: "data_dawg_agent_v2_rate_limited",
          source: "data_dawg_agent_v2",
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      // The widget keys the legacy fallback off queryType, not this text — keep it fan-safe.
      // The operator detail lives in error_message below.
      const answer = toDataDawgUserFacingError("OPENAI_API_KEY missing")
      await writeAiQueryLog({
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
        user_id: userId,
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

    // Must await — Vercel freezes the isolate after the response and drops void promises.
    await writeAiQueryLog({
      query: message,
      project,
      url: req.url,
      response: result.answer,
      query_type: result.queryType,
      handler_name: result.source,
      message_id: result.messageId,
      response_time_ms: responseTimeMs,
      success,
      user_id: userId,
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
    // `msg` can name OPENAI_API_KEY / billing URLs — log it, never show it.
    const answer = toDataDawgUserFacingError(msg)

    if (message) {
      await writeAiQueryLog({
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
        user_id: userId,
      })
    }

    return NextResponse.json(
      {
        answer,
        queryType: "data_dawg_agent_v2_error",
        source: "data_dawg_agent_v2",
        error: answer,
        messageId: messageId ?? undefined,
      },
      { status: 200 },
    )
  }
}
