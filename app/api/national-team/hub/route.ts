import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventName, getEventSlugForApi, normalizeEventSlugForLookup } from "@/lib/national-team-events"

const HUB_ACCESS_COOKIE = "nc_hub_access"
const NHSCA_HUB_SLUGS = ["nhsca-duals-2026", "nhsca-duals-2026-select"]

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
  /** Gear sizes; collected on hub for events like NHSCA Duals 2026. */
  shirt_size: string | null
  singlet_size: string | null
  shorts_size: string | null
  /** True when row came from admin lineup (national_team_interest_forms), not paid registration. */
  from_interest_form?: boolean
  /** For NHSCA: team_1 or team_2 from interest form. */
  nhsca_duals_team?: string | null
  nhsca_duals_starter?: boolean
  /** Optional profile/headshot URL when linked to an athlete (future). */
  photo_url?: string | null
  /** When the registration row was last updated (e.g. gear sizes). */
  updated_at?: string | null
  /** Display name of user who last updated (for "Last edited by" under name). */
  updated_by_display_name?: string | null
}

export type HubEvent = {
  eventSlug: string
  eventName: string
  roster: HubRegistration[]
  /** Registrations for the current user (parent_email match) — their form data. */
  myRegistrations: HubRegistration[]
  /** @deprecated Use forumGroupId/forumChannelId and Community page. Legacy thread ID for updates tab. */
  threadId: string | null
  /** Forum group ID when group name matches this event (e.g. "NHSCA Duals 2026") — link Chat tab to Community. */
  forumGroupId: string | null
  /** First channel ID of that forum group. */
  forumChannelId: string | null
  /** Message count in that channel (for badge on Chat tab). */
  forumMessageCount: number
}

export type HubResponse = {
  allowed: boolean
  reason?: "signed_out" | "no_access"
  events?: HubEvent[]
  /** True when current user is admin (so UI can show reg link / invite code info). */
  isAdmin?: boolean
  /** True when current user has at least one paid registration (parent_email) for an event they see. False = family member (workspace access only). */
  isPrimaryRegistrant?: boolean
  /** True when access was granted via access code (no sign-in). UI can prompt sign-in to edit gear. */
  accessByCode?: boolean
}

export async function GET(): Promise<NextResponse<HubResponse>> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  let accessByCode = false

  async function validateHubCookie(): Promise<boolean> {
    const cookieStore = await cookies()
    const hubCode = cookieStore.get(HUB_ACCESS_COOKIE)?.value?.trim()
    if (!hubCode) return false
    const hubCodeLower = hubCode.toLowerCase()
    const adminCheck = createAdminClient()
    const { data: codeRows, error: codeErr } = await adminCheck
      .from("national_team_invite_codes")
      .select("id, code, expires_at, max_uses, uses_count")
      .in("event_slug", NHSCA_HUB_SLUGS)
      .limit(50)
    const codeRow =
      codeErr || !Array.isArray(codeRows)
        ? null
        : codeRows.find((r) => (r as { code?: string }).code?.trim().toLowerCase() === hubCodeLower)
    if (!codeRow) return false
    const row = codeRow as { expires_at?: string | null; max_uses?: number | null; uses_count?: number }
    if (row.expires_at && new Date(row.expires_at) < new Date()) return false
    const maxUses = row.max_uses != null ? Number(row.max_uses) : null
    const usesCount = Number(row.uses_count) ?? 0
    if (maxUses != null && usesCount >= maxUses) return false
    return true
  }

  if (authError || !user?.email) {
    if (!(await validateHubCookie())) {
      console.warn("[RecruitNC] hub GET: no user and no valid cookie", { authError: !!authError, hasUser: !!user, hasEmail: !!user?.email })
      return NextResponse.json({ allowed: false, reason: "signed_out" })
    }
    accessByCode = true
  }

  const admin = createAdminClient()

  // Use admin client so RLS never hides the profile; reliable admin check.
  let profile: { is_admin?: boolean; role?: string } | null = null
  if (user?.id) {
    profile = (await admin
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
    if (!profile && user.email) {
      profile = (await admin
        .from("user_profiles")
        .select("is_admin, role")
        .ilike("email", user.email)
        .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
    }
  }

  const isAdmin = !!profile?.is_admin || profile?.role === "admin"

  const { data: allRegs, error: regError } = await admin
    .from("national_team_event_registrations")
    .select("id, event_slug, athlete_first_name, athlete_last_name, athlete_email, parent_email, parent_user_id, high_school, graduation_year, primary_weight, status, created_at, updated_at, updated_by_user_id, shirt_size, singlet_size, shorts_size")
    .eq("status", "paid")

  if (regError && !isAdmin && !accessByCode) {
    if ((regError as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { allowed: false, reason: "no_access" },
        { status: 200 }
      )
    }
    console.error("[national-team/hub]", regError)
    return NextResponse.json({ allowed: false, reason: "no_access" }, { status: 200 })
  }
  if (regError && (isAdmin || accessByCode)) {
    console.warn("[national-team/hub] Registrations query failed", regError)
  }

  const paidRegs = (regError ? [] : (allRegs ?? [])) as (HubRegistration & { parent_user_id?: string | null; updated_at?: string | null; updated_by_user_id?: string | null })[]

  // Resolve updated_by_user_id → display name for "Last edited by" (paid regs; interest-form ids added below)
  const updatedByUserIds = [...new Set(paidRegs.map((r) => r.updated_by_user_id).filter(Boolean))] as string[]
  const updatedByDisplayNames = new Map<string, string>()
  if (updatedByUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, full_name, email")
      .in("user_id", updatedByUserIds)
    for (const p of profiles ?? []) {
      const row = p as { user_id: string; full_name?: string | null; email?: string | null }
      const name = (row.full_name ?? row.email ?? "Someone")?.trim() || "Someone"
      updatedByDisplayNames.set(row.user_id, name)
    }
  }
  for (const r of paidRegs) {
    if (r.updated_by_user_id) {
      (r as HubRegistration).updated_by_display_name = updatedByDisplayNames.get(r.updated_by_user_id) ?? null
    }
  }

  // Use canonical API slug so "nhsca-2026" and "nhsca-duals-2026" both map to nhsca-duals-2026 (thread context_id).
  const toCanonical = (slug: string) => getEventSlugForApi(normalizeEventSlugForLookup(slug || "")) || slug
  let eventSlugsToShow: string[]
  if (accessByCode) {
    eventSlugsToShow = [...NHSCA_HUB_SLUGS]
  } else if (isAdmin) {
    const fromRegs = [...new Set(paidRegs.map((r) => toCanonical(r.event_slug)))]
    eventSlugsToShow = fromRegs.length > 0 ? fromRegs : ["nhsca-duals-2026", "nhsca-duals-2026-select"]
  } else if (user?.email) {
    const emailLower = (user.email ?? "").trim().toLowerCase()
    const myEventSlugs = new Set(
      paidRegs
        .filter((r) => (r.parent_email ?? "").trim().toLowerCase() === emailLower)
        .map((r) => toCanonical(r.event_slug))
    )
    try {
      const { data: workspaceRows } = await admin
        .from("event_workspace_members")
        .select("event_slug")
        .eq("user_id", user.id)
      for (const row of workspaceRows ?? []) {
        myEventSlugs.add(toCanonical((row as { event_slug: string }).event_slug))
      }
    } catch {
      // event_workspace_members table may not exist
    }
    // Lineup-only (interest form): grant hub access if their email matches contact email on any NHSCA lineup row
    try {
      const { data: lineupRows } = await admin
        .from("national_team_interest_forms")
        .select("id, email, nhsca_duals_team")
        .in("nhsca_duals_team", ["team_1", "team_2"])
      for (const row of lineupRows ?? []) {
        const r = row as { email?: string | null; nhsca_duals_team?: string | null }
        if ((r.email ?? "").trim().toLowerCase() === emailLower) {
          myEventSlugs.add(r.nhsca_duals_team === "team_2" ? "nhsca-duals-2026-select" : "nhsca-duals-2026")
        }
      }
    } catch {
      // table or column may not exist
    }
    if (myEventSlugs.size === 0) {
      const cookieValid = await validateHubCookie()
      if (cookieValid) {
        accessByCode = true
        eventSlugsToShow = [...NHSCA_HUB_SLUGS]
      } else {
        const sampleParentEmails = paidRegs.slice(0, 5).map((r) => (r.parent_email ?? "").trim())
        console.warn("[RecruitNC] hub GET: logged-in user has no matching reg and no cookie", {
          userEmail: user?.email?.trim().toLowerCase(),
          paidRegCount: paidRegs.length,
          sampleParentEmails,
        })
        return NextResponse.json({ allowed: false, reason: "no_access" })
      }
    } else {
      eventSlugsToShow = [...myEventSlugs]
    }
  } else {
    const cookieValid = await validateHubCookie()
    if (cookieValid) {
      accessByCode = true
      eventSlugsToShow = [...NHSCA_HUB_SLUGS]
    } else {
      return NextResponse.json({ allowed: false, reason: "no_access" })
    }
  }

  const emailLower = (user?.email ?? "").trim().toLowerCase()

  // Backfill parent_user_id on registrations where current user's email matches parent_email (so workspace membership is stable).
  const myRegIds = paidRegs
    .filter((r) => (r.parent_email ?? "").trim().toLowerCase() === emailLower)
    .map((r) => r.id)
  if (myRegIds.length > 0 && user?.id) {
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
    const regsForEvent = paidRegs.filter((r) => toCanonical(r.event_slug) === eventSlug)
    for (const r of regsForEvent) {
      if (r.parent_user_id) workspaceUserIds.add(r.parent_user_id)
    }
    // Resolve parent_email → user_id (user_profiles first; then Auth as fallback for profiles missing email).
    // Only the parent/guardian email is used; if that email has no RecruitNC account, nobody is added for that registration (see docs/event-thread-sync-why.md).
    const parentEmailsToResolve = [...new Set(
      regsForEvent
        .filter((r) => !r.parent_user_id && (r.parent_email ?? "").trim())
        .map((r) => (r.parent_email ?? "").trim().toLowerCase())
    )].slice(0, 200)
    const emailToUserId = new Map<string, string>()
    const unresolvedEmails: string[] = []
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
      } else {
        unresolvedEmails.push(email)
      }
    }
    if (unresolvedEmails.length > 0) {
      console.warn("[RecruitNC] hub sync: parent_email had no RecruitNC account (no thread add)", eventSlug, "unresolved:", unresolvedEmails.join(", "), "— registrations with these emails need that user to sign up at RecruitNC or be added manually to the group.")
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

  // Resolve forum group + channel by event name (e.g. "NHSCA Duals 2026" → group with that name).
  const eventNames = eventSlugsToShow.map((s) => getEventName(s))
  const { data: forumGroupsByName } = await admin
    .from("forum_groups")
    .select("id, name")
    .in("name", eventNames)
  const nameToForumGroup = new Map<string, { id: string }>()
  for (const g of forumGroupsByName ?? []) {
    const row = g as { id: string; name: string }
    nameToForumGroup.set(row.name, { id: row.id })
  }
  const forumGroupIds = [...new Set((forumGroupsByName ?? []).map((g) => (g as { id: string }).id))]
  const { data: forumChannels } = forumGroupIds.length > 0
    ? await admin
        .from("forum_channels")
        .select("id, group_id")
        .in("group_id", forumGroupIds)
        .order("position", { ascending: true })
    : { data: [] }
  const firstChannelByGroupId = new Map<string, string>()
  for (const c of forumChannels ?? []) {
    const row = c as { id: string; group_id: string }
    if (!firstChannelByGroupId.has(row.group_id)) firstChannelByGroupId.set(row.group_id, row.id)
  }
  const channelIdsForCount = [...firstChannelByGroupId.values()]
  const messageCountByChannel = new Map<string, number>()
  if (channelIdsForCount.length > 0) {
    const { data: countRows } = await admin
      .from("forum_messages")
      .select("channel_id")
      .in("channel_id", channelIdsForCount)
    const byChannel = new Map<string, number>()
    for (const r of countRows ?? []) {
      const id = (r as { channel_id: string }).channel_id
      byChannel.set(id, (byChannel.get(id) ?? 0) + 1)
    }
    byChannel.forEach((count, id) => messageCountByChannel.set(id, count))
  }

  // Roster lineup: same source as Admin → National team submissions (Team 1 / Team 2).
  // Table: national_team_interest_forms. Values: nhsca_duals_team = 'team_1' (National) | 'team_2' (Select).
  const nhscaNationalSlug = "nhsca-duals-2026"
  const nhscaSelectSlug = "nhsca-duals-2026-select"
  const interestLineupByEvent = new Map<string, (HubRegistration & { from_interest_form: true })[]>()
  if (eventSlugsToShow.includes(nhscaNationalSlug) || eventSlugsToShow.includes(nhscaSelectSlug)) {
    try {
      const { data: interestRows } = await admin
        .from("national_team_interest_forms")
        .select("id, first_name, last_name, high_school, graduation_year, primary_weight, nhsca_duals_team, nhsca_duals_starter, singlet_size, shorts_size, shirt_size, updated_at, updated_by_user_id")
        .not("nhsca_duals_team", "is", null)
        .in("nhsca_duals_team", ["team_1", "team_2"])
      const interestUpdatedByIds = [...new Set((interestRows ?? []).map((row: { updated_by_user_id?: string | null }) => row.updated_by_user_id).filter(Boolean))] as string[]
      const missingIds = interestUpdatedByIds.filter((id) => !updatedByDisplayNames.has(id))
      if (missingIds.length > 0) {
        const { data: moreProfiles } = await admin
          .from("user_profiles")
          .select("user_id, full_name, email")
          .in("user_id", missingIds)
        for (const p of moreProfiles ?? []) {
          const row = p as { user_id: string; full_name?: string | null; email?: string | null }
          const name = (row.full_name ?? row.email ?? "Someone")?.trim() || "Someone"
          updatedByDisplayNames.set(row.user_id, name)
        }
      }
      for (const row of interestRows ?? []) {
        const r = row as {
          id: string
          first_name: string
          last_name: string
          high_school: string
          graduation_year: string
          primary_weight: string
          nhsca_duals_team: string | null
          nhsca_duals_starter: boolean
          singlet_size?: string | null
          shorts_size?: string | null
          shirt_size?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        const eventSlugForLineup = r.nhsca_duals_team === "team_2" ? nhscaSelectSlug : nhscaNationalSlug
        const list = interestLineupByEvent.get(eventSlugForLineup) ?? []
        list.push({
          id: `interest-${r.id}`,
          event_slug: eventSlugForLineup,
          athlete_first_name: r.first_name,
          athlete_last_name: r.last_name,
          athlete_email: "",
          parent_email: "",
          high_school: r.high_school ?? "",
          graduation_year: r.graduation_year ?? "",
          primary_weight: r.primary_weight ?? "",
          status: "lineup",
          created_at: "",
          shirt_size: r.shirt_size ?? null,
          singlet_size: r.singlet_size ?? null,
          shorts_size: r.shorts_size ?? null,
          from_interest_form: true,
          nhsca_duals_team: r.nhsca_duals_team,
          nhsca_duals_starter: r.nhsca_duals_starter,
          updated_at: r.updated_at ?? undefined,
          updated_by_display_name: r.updated_by_user_id ? (updatedByDisplayNames.get(r.updated_by_user_id) ?? null) : undefined,
        })
        interestLineupByEvent.set(eventSlugForLineup, list)
      }
    } catch (e) {
      if ((e as { code?: string })?.code !== "42P01") {
        console.warn("[national-team/hub] interest-form lineup fetch failed", (e as Error).message)
      }
    }
  }

  const events: HubEvent[] = eventSlugsToShow.map((eventSlug) => {
    const paidRoster = paidRegs.filter((r) => toCanonical(r.event_slug) === eventSlug)
    const myRegistrations = paidRoster.filter((r) => (r.parent_email ?? "").trim().toLowerCase() === emailLower)
    const interestLineup = interestLineupByEvent.get(eventSlug) ?? []
    // Merge interest-form lineup into roster (admin lineups show). Paid regs first; then add lineup entries not already matched by name+weight.
    let roster: HubRegistration[] = [...paidRoster]
    if (interestLineup.length > 0) {
      const paidKeys = new Set(
        paidRoster.map(
          (r) =>
            `${(r.athlete_first_name ?? "").trim().toLowerCase()}-${(r.athlete_last_name ?? "").trim().toLowerCase()}-${r.primary_weight}`
        )
      )
      for (const line of interestLineup) {
        const key = `${(line.athlete_first_name ?? "").trim().toLowerCase()}-${(line.athlete_last_name ?? "").trim().toLowerCase()}-${line.primary_weight}`
        if (!paidKeys.has(key)) {
          roster.push(line)
          paidKeys.add(key)
        }
      }
      roster.sort((a, b) => {
        const wA = parseInt(a.primary_weight, 10) || 0
        const wB = parseInt(b.primary_weight, 10) || 0
        if (wA !== wB) return wA - wB
        return (a.athlete_last_name ?? "").localeCompare(b.athlete_last_name ?? "")
      })
    }
    const eventName = getEventName(eventSlug)
    const fg = nameToForumGroup.get(eventName)
    const forumGroupId = fg?.id ?? null
    const forumChannelId = forumGroupId ? firstChannelByGroupId.get(forumGroupId) ?? null : null
    const forumMessageCount = forumChannelId ? messageCountByChannel.get(forumChannelId) ?? 0 : 0
    return {
      eventSlug,
      eventName,
      roster,
      myRegistrations,
      threadId: threadIdByEvent.get(eventSlug) ?? null,
      forumGroupId,
      forumChannelId,
      forumMessageCount,
    }
  })

  const isPrimaryRegistrant = events.some((e) => e.myRegistrations.length > 0)

  return NextResponse.json({
    allowed: true,
    events,
    isAdmin,
    isPrimaryRegistrant,
    accessByCode: accessByCode || undefined,
  })
}
