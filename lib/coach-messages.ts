import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isCollegeCoachRole } from "@/lib/coach-auto-approve"
import { collegeForCoach } from "@/lib/college-domain-schools"

/**
 * Coach → prospect messaging (decided 7 Oct 2026). Not a chat product — a recruiting inbox:
 *
 * - **Coaches start every conversation.** One thread per coach per wrestler. The wrestler and
 *   their parents can only ever reply inside a thread a coach opened; there is no family compose.
 * - **Only coaches staff have reviewed.** `verified_coach` alone is not enough: access-first
 *   sign-up sets it before anyone looks (lib/coach-auto-approve, /api/auth/coach-signup). Sending
 *   needs Matt's Confirm on /admin/users-dashboard, which is `verification_status = 'approved'`.
 * - **The family always sees everything.** A thread belongs to the wrestler, not to an account:
 *   the claimed athlete and every linked parent read the same conversation. That openness is the
 *   safeguard - no adult has a private line to a minor here.
 * - **The family can switch a coach off.** A stopped thread stays readable; the coach cannot send.
 *
 * Every table is server-only (scripts/add-coach-messages.sql); this module is the one way in.
 */

export const MAX_BODY = 4000
/** New conversations a coach may open in 24 hours. Replies inside existing ones are not capped. */
export const DAILY_NEW_THREADS = 25

export type ThreadRole = "coach" | "athlete" | "parent" | "admin"

type CoachProfile = {
  role?: string | null
  verified_coach?: boolean | null
  verification_status?: string | null
}

/** Reviewed by staff, not merely let in at sign-up. */
export function isApprovedCoach(profile: CoachProfile | null | undefined): boolean {
  if (!profile) return false
  return (
    isCollegeCoachRole(profile.role) &&
    profile.verified_coach === true &&
    String(profile.verification_status ?? "").toLowerCase() === "approved"
  )
}

/** Trimmed message text, or an error a person can act on. */
export function cleanBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : ""
  if (!body) return { ok: false, error: "Write a message first." }
  if (body.length > MAX_BODY) return { ok: false, error: `Keep it under ${MAX_BODY} characters.` }
  return { ok: true, body }
}

export function displayName(p: { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null | undefined): string {
  const full = String(p?.full_name ?? "").trim()
  if (full) return full
  return [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim()
}

export function firstName(name: string | null | undefined): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "your wrestler"
}

/** "Coach Smith" from "John Smith"; "A coach" when the profile has no name. */
export function coachLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length ? `Coach ${parts[parts.length - 1]}` : "A coach"
}

const PROFILE_COLUMNS = "user_id, role, verified_coach, verification_status, institution, email, full_name, first_name, last_name, is_admin"

type ProfileRow = CoachProfile & {
  user_id: string
  institution?: string | null
  email?: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  is_admin?: boolean | null
}

async function loadProfile(admin: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data } = await admin.from("user_profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle()
  return (data as ProfileRow | null) ?? null
}

/** The wrestler's own account and every linked parent - the people a thread belongs to. */
export async function familyOf(
  admin: SupabaseClient,
  athleteId: string,
): Promise<{ athleteUserId: string | null; parentUserIds: string[] }> {
  const [{ data: athlete }, { data: links }] = await Promise.all([
    admin.from("athletes").select("claimed_by_user_id").eq("id", athleteId).maybeSingle(),
    admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athleteId),
  ])
  const athleteUserId = (athlete?.claimed_by_user_id as string | null) ?? null
  const parentUserIds = [
    ...new Set(
      (links ?? [])
        .map((l) => (l as { user_id: string }).user_id)
        .filter((id): id is string => Boolean(id) && id !== athleteUserId),
    ),
  ]
  return { athleteUserId, parentUserIds }
}

/** Athlete ids this account is family for: claimed by it, or linked to it as a parent. */
async function familyAthleteIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: own }, { data: links }] = await Promise.all([
    admin.from("athletes").select("id").eq("claimed_by_user_id", userId),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
  ])
  return [
    ...new Set([
      ...(own ?? []).map((a) => String((a as { id: string }).id)),
      ...(links ?? []).map((l) => String((l as { athlete_id: string }).athlete_id)),
    ]),
  ]
}

type ThreadRow = {
  id: string
  coach_user_id: string
  athlete_id: string
  program: string | null
  created_at: string
  last_message_at: string
  stopped_at: string | null
}

const THREAD_COLUMNS = "id, coach_user_id, athlete_id, program, created_at, last_message_at, stopped_at"

/** What this account is to this thread, or null when it has no business reading it. */
export async function roleInThread(
  admin: SupabaseClient,
  thread: Pick<ThreadRow, "coach_user_id" | "athlete_id">,
  userId: string,
): Promise<ThreadRole | null> {
  if (thread.coach_user_id === userId) return "coach"
  const family = await familyOf(admin, thread.athlete_id)
  if (family.athleteUserId === userId) return "athlete"
  if (family.parentUserIds.includes(userId)) return "parent"
  const profile = await loadProfile(admin, userId)
  if (profile?.is_admin === true) return "admin"
  return null
}

export type CanMessage =
  | { ok: true; threadId: string | null; stopped: false; athleteName: string }
  | { ok: false; reason: "not_coach" | "unreviewed" | "stopped" | "no_athlete" | "self"; threadId?: string | null; message: string }

/** May this account message this wrestler, and is there already a conversation? */
export async function canMessage(admin: SupabaseClient, userId: string, athleteId: string): Promise<CanMessage> {
  const profile = await loadProfile(admin, userId)
  if (!profile || !isCollegeCoachRole(profile.role)) {
    return { ok: false, reason: "not_coach", message: "Only college coaches can message wrestlers." }
  }
  if (!isApprovedCoach(profile)) {
    return {
      ok: false,
      reason: "unreviewed",
      message: "Messaging opens once NC United has confirmed your coaching account. That is usually within a day.",
    }
  }
  const { data: athlete } = await admin.from("athletes").select("id, name, claimed_by_user_id").eq("id", athleteId).maybeSingle()
  if (!athlete) return { ok: false, reason: "no_athlete", message: "That profile does not exist." }
  if (athlete.claimed_by_user_id === userId) return { ok: false, reason: "self", message: "This is your own profile." }

  const { data: thread } = await admin
    .from("coach_threads")
    .select("id, stopped_at")
    .eq("coach_user_id", userId)
    .eq("athlete_id", athleteId)
    .maybeSingle()
  if (thread?.stopped_at) {
    return { ok: false, reason: "stopped", threadId: thread.id as string, message: "This family has turned off messages from you." }
  }
  return { ok: true, threadId: (thread?.id as string | undefined) ?? null, stopped: false, athleteName: String(athlete.name ?? "") }
}

export type SendResult =
  | { ok: true; threadId: string; messageId: string; isNewThread: boolean; senderRole: Exclude<ThreadRole, "admin"> }
  | { ok: false; status: 400 | 403 | 404 | 429 | 500; error: string }

/** A coach writes to a wrestler: opens the conversation the first time, continues it after. */
export async function coachSend(admin: SupabaseClient, coachUserId: string, athleteId: string, rawBody: unknown): Promise<SendResult> {
  const cleaned = cleanBody(rawBody)
  if (!cleaned.ok) return { ok: false, status: 400, error: cleaned.error }

  const gate = await canMessage(admin, coachUserId, athleteId)
  if (!gate.ok) return { ok: false, status: gate.reason === "no_athlete" ? 404 : 403, error: gate.message }

  let threadId = gate.threadId
  let isNewThread = false
  if (!threadId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from("coach_threads")
      .select("id", { count: "exact", head: true })
      .eq("coach_user_id", coachUserId)
      .gte("created_at", since)
    if ((count ?? 0) >= DAILY_NEW_THREADS) {
      return {
        ok: false,
        status: 429,
        error: `You can start ${DAILY_NEW_THREADS} new conversations a day. Replies to existing ones are not limited.`,
      }
    }
    const profile = await loadProfile(admin, coachUserId)
    const program = collegeForCoach({ institution: profile?.institution ?? null, email: profile?.email ?? null })
    const { data: created, error } = await admin
      .from("coach_threads")
      .insert({ coach_user_id: coachUserId, athlete_id: athleteId, program })
      .select("id")
      .single()
    if (error || !created) {
      // Two tabs racing: the unique key kept one thread; use it.
      const { data: existing } = await admin
        .from("coach_threads")
        .select("id")
        .eq("coach_user_id", coachUserId)
        .eq("athlete_id", athleteId)
        .maybeSingle()
      if (!existing) return { ok: false, status: 500, error: "Could not start the conversation." }
      threadId = existing.id as string
    } else {
      threadId = created.id as string
      isNewThread = true
    }
  }

  return insertMessage(admin, threadId, coachUserId, "coach", cleaned.body, isNewThread)
}

/** Anyone in the conversation writes inside it. Families can only ever reach this through a coach's thread. */
export async function replyInThread(admin: SupabaseClient, threadId: string, userId: string, rawBody: unknown): Promise<SendResult> {
  const cleaned = cleanBody(rawBody)
  if (!cleaned.ok) return { ok: false, status: 400, error: cleaned.error }

  const { data: thread } = await admin.from("coach_threads").select(THREAD_COLUMNS).eq("id", threadId).maybeSingle()
  if (!thread) return { ok: false, status: 404, error: "That conversation does not exist." }

  const role = await roleInThread(admin, thread as ThreadRow, userId)
  if (!role || role === "admin") return { ok: false, status: 403, error: "You are not part of this conversation." }

  if (role === "coach") {
    if (thread.stopped_at) return { ok: false, status: 403, error: "This family has turned off messages from you." }
    // Re-checked on every send: a coach whose review is revoked stops here, not at the next thread.
    const profile = await loadProfile(admin, userId)
    if (!isApprovedCoach(profile)) return { ok: false, status: 403, error: "Your coaching account is not confirmed." }
  }

  return insertMessage(admin, threadId, userId, role, cleaned.body, false)
}

async function insertMessage(
  admin: SupabaseClient,
  threadId: string,
  userId: string,
  role: Exclude<ThreadRole, "admin">,
  body: string,
  isNewThread: boolean,
): Promise<SendResult> {
  const now = new Date().toISOString()
  const { data: message, error } = await admin
    .from("coach_messages")
    .insert({ thread_id: threadId, sender_user_id: userId, sender_role: role, body, created_at: now })
    .select("id")
    .single()
  if (error || !message) return { ok: false, status: 500, error: "Could not send. Try again." }

  await Promise.all([
    admin.from("coach_threads").update({ last_message_at: now }).eq("id", threadId),
    // Your own message is read by definition.
    admin.from("coach_thread_reads").upsert({ thread_id: threadId, user_id: userId, last_read_at: now }, { onConflict: "thread_id,user_id" }),
  ])
  return { ok: true, threadId, messageId: message.id as string, isNewThread, senderRole: role }
}

export type ThreadSummary = {
  id: string
  athleteId: string
  athleteName: string
  coachName: string
  program: string | null
  lastMessageAt: string
  lastMessagePreview: string
  lastSenderRole: string | null
  unread: boolean
  stopped: boolean
  /** How this account sees the thread. */
  viewerRole: Exclude<ThreadRole, "admin">
}

/** Every conversation this account is in, newest first: as the coach, or as family. */
export async function listThreads(admin: SupabaseClient, userId: string, opts: { athleteId?: string } = {}): Promise<ThreadSummary[]> {
  const athleteIds = await familyAthleteIds(admin, userId)

  const queries = [admin.from("coach_threads").select(THREAD_COLUMNS).eq("coach_user_id", userId)]
  if (athleteIds.length) queries.push(admin.from("coach_threads").select(THREAD_COLUMNS).in("athlete_id", athleteIds))
  const results = await Promise.all(queries.map((q) => (opts.athleteId ? q.eq("athlete_id", opts.athleteId) : q)))

  const byId = new Map<string, ThreadRow>()
  for (const r of results) for (const t of (r.data ?? []) as ThreadRow[]) byId.set(t.id, t)
  const threads = [...byId.values()].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
  if (!threads.length) return []

  const ids = threads.map((t) => t.id)
  const [{ data: athletes }, { data: coaches }, { data: reads }, { data: messages }] = await Promise.all([
    admin.from("athletes").select("id, name, claimed_by_user_id").in("id", [...new Set(threads.map((t) => t.athlete_id))]),
    admin.from("user_profiles").select("user_id, full_name, first_name, last_name").in("user_id", [...new Set(threads.map((t) => t.coach_user_id))]),
    admin.from("coach_thread_reads").select("thread_id, last_read_at").eq("user_id", userId).in("thread_id", ids),
    // Latest message per thread. Threads are short; this reads the recent tail and keeps the first per thread.
    admin.from("coach_messages").select("thread_id, body, sender_role, created_at").in("thread_id", ids).order("created_at", { ascending: false }).limit(Math.max(50, ids.length * 5)),
  ])

  const athleteName = new Map((athletes ?? []).map((a) => [String(a.id), String(a.name ?? "")]))
  const claimedBy = new Map((athletes ?? []).map((a) => [String(a.id), (a.claimed_by_user_id as string | null) ?? null]))
  const coachName = new Map((coaches ?? []).map((c) => [String(c.user_id), displayName(c)]))
  const readAt = new Map((reads ?? []).map((r) => [String(r.thread_id), String(r.last_read_at)]))
  const latest = new Map<string, { body: string; sender_role: string; created_at: string }>()
  for (const m of (messages ?? []) as Array<{ thread_id: string; body: string; sender_role: string; created_at: string }>) {
    if (!latest.has(m.thread_id)) latest.set(m.thread_id, m)
  }

  return threads.map((t) => {
    const last = latest.get(t.id)
    const viewerRole: ThreadSummary["viewerRole"] =
      t.coach_user_id === userId ? "coach" : claimedBy.get(t.athlete_id) === userId ? "athlete" : "parent"
    const read = readAt.get(t.id)
    return {
      id: t.id,
      athleteId: t.athlete_id,
      athleteName: athleteName.get(t.athlete_id) ?? "",
      coachName: coachName.get(t.coach_user_id) || "College coach",
      program: t.program,
      lastMessageAt: t.last_message_at,
      lastMessagePreview: (last?.body ?? "").slice(0, 160),
      lastSenderRole: last?.sender_role ?? null,
      unread: !read || read < t.last_message_at,
      stopped: Boolean(t.stopped_at),
      viewerRole,
    }
  })
}

export type ThreadDetail = {
  id: string
  athleteId: string
  athleteName: string
  coachName: string
  program: string | null
  stopped: boolean
  viewerRole: ThreadRole
  canReply: boolean
  messages: Array<{ id: string; body: string; senderRole: string; senderName: string; createdAt: string; mine: boolean }>
}

/** One conversation with every message, marked read for this account. */
export async function getThread(admin: SupabaseClient, threadId: string, userId: string): Promise<ThreadDetail | null> {
  const { data: thread } = await admin.from("coach_threads").select(THREAD_COLUMNS).eq("id", threadId).maybeSingle()
  if (!thread) return null
  const t = thread as ThreadRow
  const role = await roleInThread(admin, t, userId)
  if (!role) return null

  const { data: messages } = await admin
    .from("coach_messages")
    .select("id, body, sender_role, sender_user_id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  const senderIds = [...new Set([t.coach_user_id, ...(messages ?? []).map((m) => m.sender_user_id as string).filter(Boolean)])]
  const [{ data: profiles }, { data: athlete }] = await Promise.all([
    admin.from("user_profiles").select("user_id, full_name, first_name, last_name").in("user_id", senderIds),
    admin.from("athletes").select("name").eq("id", t.athlete_id).maybeSingle(),
  ])
  const names = new Map((profiles ?? []).map((p) => [String(p.user_id), displayName(p)]))
  const wrestler = String(athlete?.name ?? "")

  // An admin reading for a report does not mark it read for the people in it.
  if (role !== "admin") {
    await admin
      .from("coach_thread_reads")
      .upsert({ thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() }, { onConflict: "thread_id,user_id" })
  }

  return {
    id: t.id,
    athleteId: t.athlete_id,
    athleteName: wrestler,
    coachName: names.get(t.coach_user_id) || "College coach",
    program: t.program,
    stopped: Boolean(t.stopped_at),
    viewerRole: role,
    canReply: role === "athlete" || role === "parent" || (role === "coach" && !t.stopped_at),
    messages: (messages ?? []).map((m) => {
      const senderRole = String(m.sender_role)
      const name = names.get(String(m.sender_user_id)) || ""
      return {
        id: String(m.id),
        body: String(m.body),
        senderRole,
        senderName:
          senderRole === "coach"
            ? name || "Coach"
            : senderRole === "athlete"
              ? firstName(wrestler)
              : name
                ? `${name} (parent)`
                : `${firstName(wrestler)}'s parent`,
        createdAt: String(m.created_at),
        mine: m.sender_user_id === userId,
      }
    }),
  }
}

/** The family's off switch, and its undo. */
export async function setStopped(admin: SupabaseClient, threadId: string, userId: string, stopped: boolean): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { data: thread } = await admin.from("coach_threads").select(THREAD_COLUMNS).eq("id", threadId).maybeSingle()
  if (!thread) return { ok: false, status: 404, error: "That conversation does not exist." }
  const role = await roleInThread(admin, thread as ThreadRow, userId)
  if (role !== "athlete" && role !== "parent") return { ok: false, status: 403, error: "Only the wrestler or a parent can do this." }
  await admin
    .from("coach_threads")
    .update(stopped ? { stopped_at: new Date().toISOString(), stopped_by_user_id: userId } : { stopped_at: null, stopped_by_user_id: null })
    .eq("id", threadId)
  return { ok: true }
}

/** Anyone in a conversation may report it; staff answer within 24 hours (App Store 1.2). */
export async function reportThread(
  admin: SupabaseClient,
  threadId: string,
  userId: string,
  input: { messageId?: string | null; reason?: string | null },
): Promise<{ ok: boolean; status?: number; error?: string; reportId?: string }> {
  const { data: thread } = await admin.from("coach_threads").select(THREAD_COLUMNS).eq("id", threadId).maybeSingle()
  if (!thread) return { ok: false, status: 404, error: "That conversation does not exist." }
  const role = await roleInThread(admin, thread as ThreadRow, userId)
  if (!role || role === "admin") return { ok: false, status: 403, error: "You are not part of this conversation." }
  const { data, error } = await admin
    .from("coach_message_reports")
    .insert({
      thread_id: threadId,
      message_id: input.messageId ?? null,
      reporter_user_id: userId,
      reason: String(input.reason ?? "").trim().slice(0, 1000) || null,
    })
    .select("id")
    .single()
  if (error || !data) return { ok: false, status: 500, error: "Could not file the report. Email info@ncwrestlingunited.com." }
  return { ok: true, reportId: data.id as string }
}

/** Unread conversations for the badge. */
export async function unreadCount(admin: SupabaseClient, userId: string): Promise<number> {
  const threads = await listThreads(admin, userId)
  return threads.filter((t) => t.unread).length
}
