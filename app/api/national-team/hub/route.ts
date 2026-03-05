import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName } from "@/lib/national-team-events"

export type HubRegistration = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  high_school: string
  graduation_year: string
  primary_weight: string
  status: string
  created_at: string
}

export type HubEvent = {
  eventSlug: string
  eventName: string
  roster: HubRegistration[]
  /** Registrations for the current user (parent_email match) — their form data. */
  myRegistrations: HubRegistration[]
  /** Messaging thread ID for this event (context_type=event, context_id=eventSlug), if one exists. */
  threadId: string | null
}

export type HubResponse = {
  allowed: boolean
  reason?: "signed_out" | "no_access"
  events?: HubEvent[]
  /** True when current user is admin (so UI can show reg link / invite code info). */
  isAdmin?: boolean
}

export async function GET(): Promise<NextResponse<HubResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ allowed: false, reason: "signed_out" })
  }

  const admin = createAdminClient()

  // Use admin client so RLS never hides the profile; reliable admin check.
  let profile = (await admin
    .from("user_profiles")
    .select("is_admin, role")
    .eq("user_id", user.id)
    .maybeSingle()).data as { is_admin?: boolean; role?: string } | null

  // Fallback: look up by email in case profile is keyed differently
  if (!profile && user.email) {
    profile = (await admin
      .from("user_profiles")
      .select("is_admin, role")
      .ilike("email", user.email)
      .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
  }

  const isAdmin = !!profile?.is_admin || profile?.role === "admin"

  const { data: allRegs, error: regError } = await admin
    .from("national_team_event_registrations")
    .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, parent_user_id, high_school, graduation_year, primary_weight, status, created_at")
    .eq("status", "paid")

  if (regError) {
    if (isAdmin) {
      console.warn("[national-team/hub] Admin access: registrations query failed", regError)
      return NextResponse.json({ allowed: true, events: [], isAdmin: true })
    }
    if ((regError as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { allowed: false, reason: "no_access" },
        { status: 200 }
      )
    }
    console.error("[national-team/hub]", regError)
    return NextResponse.json({ allowed: false, reason: "no_access" }, { status: 200 })
  }

  const paidRegs = (allRegs ?? []) as (HubRegistration & { parent_user_id?: string | null })[]

  let eventSlugsToShow: string[]
  if (isAdmin) {
    const fromRegs = [...new Set(paidRegs.map((r) => r.event_slug))]
    eventSlugsToShow = fromRegs.length > 0 ? fromRegs : ["nhsca-duals-2026"]
  } else {
    const emailLower = user.email.toLowerCase()
    const myEventSlugs = new Set(
      paidRegs
        .filter((r) => (r.parent_email ?? "").toLowerCase() === emailLower)
        .map((r) => r.event_slug)
    )
    try {
      const { data: workspaceRows } = await admin
        .from("event_workspace_members")
        .select("event_slug")
        .eq("user_id", user.id)
      for (const row of workspaceRows ?? []) {
        myEventSlugs.add((row as { event_slug: string }).event_slug)
      }
    } catch {
      // event_workspace_members table may not exist
    }
    if (myEventSlugs.size === 0) {
      return NextResponse.json({ allowed: false, reason: "no_access" })
    }
    eventSlugsToShow = [...myEventSlugs]
  }

  const emailLower = user.email!.toLowerCase()

  // Backfill parent_user_id on registrations where current user's email matches parent_email (so workspace membership is stable).
  const myRegIds = paidRegs
    .filter((r) => (r.parent_email ?? "").toLowerCase() === emailLower)
    .map((r) => r.id)
  if (myRegIds.length > 0) {
    await admin
      .from("national_team_event_registrations")
      .update({ parent_user_id: user.id, updated_at: new Date().toISOString() })
      .in("id", myRegIds)
      .eq("status", "paid")
  }

  const { data: eventThreads } = await admin
    .from("messaging_threads")
    .select("id, context_id")
    .eq("context_type", "event")
    .in("context_id", eventSlugsToShow)
  const threadIdByEvent = new Map<string, string>()
  for (const row of eventThreads ?? []) {
    const r = row as { id: string; context_id: string | null }
    if (r.context_id) threadIdByEvent.set(r.context_id, r.id)
  }

  // If admin and an event has no group chat thread yet, create it so the forum appears.
  if (isAdmin) {
    const userClient = await createClient()
    for (const eventSlug of eventSlugsToShow) {
      if (threadIdByEvent.has(eventSlug)) continue
      const eventName = getEventName(eventSlug)
      const now = new Date().toISOString()
      const { data: newThread, error: createErr } = await admin
        .from("messaging_threads")
        .insert({
          type: "group",
          name: `${eventName} chat`,
          context_type: "event",
          context_id: eventSlug,
          created_by_user_id: user.id,
          created_at: now,
          last_message_at: now,
        })
        .select("id")
        .single()
      if (createErr || !newThread) {
        console.warn("[national-team/hub] Could not create event thread", eventSlug, createErr)
        continue
      }
      threadIdByEvent.set(eventSlug, newThread.id)
      const memberRow = {
        thread_id: newThread.id,
        user_id: user.id,
        role: "admin" as const,
        notification_level: "all" as const,
        joined_at: now,
      }
      const { error: memberErr } = await userClient.from("messaging_thread_members").insert(memberRow)
      if (memberErr) {
        const { error: adminMemberErr } = await admin.from("messaging_thread_members").insert(memberRow)
        if (adminMemberErr) console.warn("[national-team/hub] Could not add admin to event thread", eventSlug, adminMemberErr)
      }
    }
  }

  // Workspace ↔ forum sync: everyone who can see the workspace is in the forum; everyone in the forum can see the workspace.
  const now = new Date().toISOString()

  // 1) Ensure current user is in event_workspace_members for each event they have access to (source: registration).
  try {
    for (const eventSlug of eventSlugsToShow) {
      await admin.from("event_workspace_members").upsert(
        { event_slug: eventSlug, user_id: user.id, source: "registration", created_at: now },
        { onConflict: "event_slug,user_id", ignoreDuplicates: true }
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if ((e as { code?: string })?.code !== "42P01") {
      console.warn("[national-team/hub] event_workspace_members upsert (table may not exist)", msg)
    }
  }

  for (const eventSlug of eventSlugsToShow) {
    const threadId = threadIdByEvent.get(eventSlug)
    if (!threadId) continue

    // 2) Workspace members = distinct parent_user_id from paid regs + parent_email resolved to user_id + event_workspace_members.
    const workspaceUserIds = new Set<string>()
    const regsForEvent = paidRegs.filter((r) => r.event_slug === eventSlug)
    for (const r of regsForEvent) {
      if (r.parent_user_id) workspaceUserIds.add(r.parent_user_id)
    }
    // Resolve parent_email → user_id (user_profiles first; then Auth as fallback for profiles missing email).
    const parentEmailsToResolve = [...new Set(
      regsForEvent
        .filter((r) => !r.parent_user_id && (r.parent_email ?? "").trim())
        .map((r) => (r.parent_email ?? "").trim().toLowerCase())
    )].slice(0, 200)
    const emailToUserId = new Map<string, string>()
    for (const email of parentEmailsToResolve) {
      const { data: rows } = await admin
        .from("user_profiles")
        .select("user_id, email")
        .ilike("email", email)
        .limit(1)
      let row = rows?.[0] as { user_id: string; email?: string | null } | undefined
      if (!row) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const match = users?.find((u) => (u.email ?? "").toLowerCase() === email)
        if (match) row = { user_id: match.id, email: match.email ?? undefined }
      }
      if (row) {
        const em = (row.email ?? "").trim().toLowerCase() || email
        emailToUserId.set(em, row.user_id)
        workspaceUserIds.add(row.user_id)
      }
    }
    console.warn("[RecruitNC] hub sync", eventSlug, "regs:", regsForEvent.length, "emails to resolve:", parentEmailsToResolve.length, "resolved:", emailToUserId.size, "workspace members:", workspaceUserIds.size)
    // Backfill parent_user_id on regs so next time we don't need to resolve.
    for (const r of regsForEvent) {
      if (r.parent_user_id) continue
      const em = (r.parent_email ?? "").trim().toLowerCase()
      const uid = em ? emailToUserId.get(em) : null
      if (uid) {
        await admin
          .from("national_team_event_registrations")
          .update({ parent_user_id: uid, updated_at: now })
          .eq("id", r.id)
      }
    }
    try {
      const { data: explicitRows } = await admin
        .from("event_workspace_members")
        .select("user_id")
        .eq("event_slug", eventSlug)
      for (const row of explicitRows ?? []) {
        workspaceUserIds.add((row as { user_id: string }).user_id)
      }
    } catch {
      // table may not exist
    }

    // 3) Sync workspace → forum: add every workspace member to the thread.
    const { data: existingThreadMembers } = await admin
      .from("messaging_thread_members")
      .select("user_id")
      .eq("thread_id", threadId)
    const inThread = new Set((existingThreadMembers ?? []).map((r) => (r as { user_id: string }).user_id))
    for (const uid of workspaceUserIds) {
      if (inThread.has(uid)) continue
      const { error: addErr } = await admin.from("messaging_thread_members").insert({
        thread_id: threadId,
        user_id: uid,
        role: "member",
        notification_level: "all",
        joined_at: now,
      })
      if (addErr && (addErr as { code?: string }).code !== "23505") {
        console.warn("[national-team/hub] Could not add workspace member to thread", eventSlug, uid, addErr.message)
      } else {
        inThread.add(uid)
      }
    }

    // 4) Sync forum → workspace: add every thread member to event_workspace_members (so invite-link joiners see the hub).
    try {
      const { data: threadMemberRows } = await admin
        .from("messaging_thread_members")
        .select("user_id")
        .eq("thread_id", threadId)
      for (const row of threadMemberRows ?? []) {
        const uid = (row as { user_id: string }).user_id
        await admin.from("event_workspace_members").upsert(
          { event_slug: eventSlug, user_id: uid, source: "forum_invite", created_at: now },
          { onConflict: "event_slug,user_id", ignoreDuplicates: true }
        )
      }
    } catch (e) {
      if ((e as { code?: string })?.code !== "42P01") {
        console.warn("[national-team/hub] event_workspace_members sync from forum", (e as Error).message)
      }
    }
  }

  const events: HubEvent[] = eventSlugsToShow.map((eventSlug) => {
    const roster = paidRegs.filter((r) => r.event_slug === eventSlug)
    const myRegistrations = roster.filter((r) => (r.parent_email ?? "").toLowerCase() === emailLower)
    return {
      eventSlug,
      eventName: getEventName(eventSlug),
      roster,
      myRegistrations,
      threadId: threadIdByEvent.get(eventSlug) ?? null,
    }
  })

  return NextResponse.json({
    allowed: true,
    events,
    isAdmin,
  })
}
