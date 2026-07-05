import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const MAX_NOTES = 4000
const MAX_QUERY = 8000
const MAX_RESPONSE = 12000

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const correctionNotes = typeof body.correctionNotes === "string" ? body.correctionNotes.trim() : ""
    if (!correctionNotes || correctionNotes.length < 5) {
      return NextResponse.json(
        { error: "Please describe what looks incorrect (at least 5 characters)." },
        { status: 400 },
      )
    }
    if (correctionNotes.length > MAX_NOTES) {
      return NextResponse.json({ error: "Correction notes are too long." }, { status: 400 })
    }

    const userQuery = typeof body.userQuery === "string" ? body.userQuery.trim().slice(0, MAX_QUERY) : null
    const assistantResponse =
      typeof body.assistantResponse === "string" ? body.assistantResponse.trim().slice(0, MAX_RESPONSE) : null
    const messageId = typeof body.messageId === "string" ? body.messageId.trim().slice(0, 200) : null
    const submitterName =
      typeof body.submitterName === "string" ? body.submitterName.trim().slice(0, 120) || null : null
    const submitterEmail =
      typeof body.submitterEmail === "string" ? body.submitterEmail.trim().slice(0, 200) || null : null
    const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.trim().slice(0, 500) || null : null
    const source = typeof body.source === "string" ? body.source.trim().slice(0, 80) || "data_dawg_widget" : "data_dawg_widget"

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const { data, error } = await admin
      .from("data_dawg_feedback")
      .insert({
        status: "pending",
        user_query: userQuery,
        assistant_response: assistantResponse,
        message_id: messageId,
        correction_notes: correctionNotes,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        page_url: pageUrl,
        source,
        created_at: now,
        updated_at: now,
      })
      .select("id, status, created_at")
      .single()

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Feedback storage is not set up yet. Ask admin to run scripts/data-dawg-feedback.sql in Supabase." },
          { status: 503 },
        )
      }
      console.error("[RecruitNC] data-dawg feedback POST", error)
      return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      status: data.status,
      message: "Thanks — we'll review this and update our data when needed.",
    })
  } catch (e) {
    console.error("[RecruitNC] data-dawg feedback POST exception", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
