import { NextRequest, NextResponse } from "next/server"
import { runDataDawgAgentV2 } from "@/lib/data-dawg-agent-v2/run-data-dawg-agent"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : undefined
    const messageId = typeof body.messageId === "string" ? body.messageId : undefined

    if (!message) {
      return NextResponse.json(
        { error: "message is required", answer: "Send a non-empty message." },
        { status: 400 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        answer:
          "Data Dawg Agent v2 requires OpenAI (OPENAI_API_KEY). Use the standard Data Dawg endpoint or add OPENAI_API_KEY for this mode.",
        queryType: "data_dawg_agent_v2_config",
        source: "data_dawg_agent_v2",
      })
    }

    const result = await runDataDawgAgentV2({
      message,
      conversationHistory,
      messageId,
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
    return NextResponse.json(
      {
        answer: `Data Dawg hit an error: ${msg}`,
        queryType: "data_dawg_agent_v2_error",
        source: "data_dawg_agent_v2",
        error: msg,
      },
      { status: 200 },
    )
  }
}
