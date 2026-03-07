import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName } from "@/lib/national-team-events"

/** POST: Add a member to the event workspace by email or user_id (RecruitNC user). They are auto-added to the forum. Caller must be a workspace member. Sends email + SMS with hub link. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventSlug: string }> }
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { eventSlug } = await params
  if (!eventSlug?.trim()) {
    return NextResponse.json({ error: "eventSlug is required" }, { status: 400 })
  }

  let body: { email?: string; user_id?: string; source?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const emailInput = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const userIdInput = typeof body.user_id === "string" ? body.user_id.trim() : ""
  if (!userIdInput && !emailInput) {
    return NextResponse.json({ error: "email or user_id is required" }, { status: 400 })
  }
  const source = (body.source === "athlete_linked" ? "athlete_linked" : "family_add") as "family_add" | "athlete_linked"

  const admin = createAdminClient()

  // Caller must be a workspace member: in event_workspace_members or have a paid reg with parent_email match.
  const { data: regs } = await admin
    .from("national_team_event_registrations")
    .select("parent_email")
    .eq("event_slug", eventSlug)
    .eq("status", "paid")
  const parentEmails = new Set(
    (regs ?? []).map((r) => (r as { parent_email?: string }).parent_email?.toLowerCase()).filter(Boolean)
  )
  let callerIsMember = parentEmails.has(user.email!.toLowerCase())
  if (!callerIsMember) {
    try {
      const { data: wm } = await admin
        .from("event_workspace_members")
        .select("user_id")
        .eq("event_slug", eventSlug)
        .eq("user_id", user.id)
        .maybeSingle()
      callerIsMember = !!wm
    } catch {
      // table may not exist
    }
  }
  if (!callerIsMember) {
    return NextResponse.json({ error: "You must be a member of this event workspace to add others" }, { status: 403 })
  }

  let userIdToAdd: string
  let emailForNotification: string
  let cellPhoneForSms: string | null = null

  if (userIdInput) {
    // Add by user_id (from RecruitNC user lookup).
    const { data: profile } = await admin
      .from("user_profiles")
      .select("user_id, email, cell_phone")
      .eq("user_id", userIdInput)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }
    const p = profile as { user_id: string; email?: string | null; cell_phone?: string | null }
    userIdToAdd = p.user_id
    emailForNotification = p.email ?? ""
    cellPhoneForSms = (p.cell_phone ?? "").trim() || null
  } else {
    // Resolve email → user_id (user_profiles; auth users have profiles after signup).
    const { data: profile } = await admin
      .from("user_profiles")
      .select("user_id, email, cell_phone")
      .ilike("email", emailInput)
      .maybeSingle()
    const uid = (profile as { user_id?: string } | null)?.user_id
    if (!uid) {
      return NextResponse.json(
        { error: "No RecruitNC account found for that email. They need to sign up first, then you can add them." },
        { status: 404 }
      )
    }
    const p = profile as { user_id: string; email?: string | null; cell_phone?: string | null }
    userIdToAdd = uid
    emailForNotification = p.email ?? emailInput
    cellPhoneForSms = (p.cell_phone ?? "").trim() || null
  }

  if (userIdToAdd === user.id) {
    return NextResponse.json({ error: "You are already in the workspace" }, { status: 400 })
  }

  const now = new Date().toISOString()

  try {
    await admin.from("event_workspace_members").upsert(
      {
        event_slug: eventSlug,
        user_id: userIdToAdd,
        source,
        added_by_user_id: user.id,
        created_at: now,
      },
      { onConflict: "event_slug,user_id", ignoreDuplicates: true }
    )
  } catch (e) {
    if ((e as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { error: "Workspace members table is not set up. Run the SQL in scripts/event-workspace-members-and-sync.md" },
        { status: 503 }
      )
    }
    throw e
  }

  // Add to forum (event thread) so they see the group chat and get sync both ways.
  const { data: thread } = await admin
    .from("messaging_threads")
    .select("id, name")
    .eq("context_type", "event")
    .eq("context_id", eventSlug)
    .maybeSingle()

  if (thread) {
    const threadId = (thread as { id: string }).id
    const threadName = (thread as { name?: string }).name ?? "Event group"
    const { data: existing } = await admin
      .from("messaging_thread_members")
      .select("user_id")
      .eq("thread_id", threadId)
      .eq("user_id", userIdToAdd)
      .maybeSingle()
    if (!existing) {
      await admin.from("messaging_thread_members").insert({
        thread_id: threadId,
        user_id: userIdToAdd,
        role: "member",
        notification_level: "all",
        joined_at: now,
      })
    }
  }

  // Notify the user they were added: email + SMS with link to the hub (not just the thread).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.ncwrestlingunited.com"
  const hubUrl = `${baseUrl.replace(/\/$/, "")}/national-team/hub`
  const eventName = getEventName(eventSlug)
  if (emailForNotification) {
    try {
      const { sendAddedToHubEmail } = await import("@/lib/email")
      await sendAddedToHubEmail(emailForNotification, eventName, hubUrl)
    } catch (e) {
      console.error("[RecruitNC] workspace add-member email:", e)
    }
  }
  if (cellPhoneForSms) {
    try {
      const { sendSms, toE164 } = await import("@/lib/sms")
      const e164 = toE164(cellPhoneForSms)
      if (e164) {
        await sendSms(e164, `RecruitNC: You've been added to ${eventName}. View hub: ${hubUrl}`)
      }
    } catch (e) {
      console.error("[RecruitNC] workspace add-member SMS:", e)
    }
  }

  return NextResponse.json({ ok: true, added_user_id: userIdToAdd })
}
