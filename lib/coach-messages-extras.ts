import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { familyOf, roleInThread, type ThreadRole } from "@/lib/coach-messages"
import { COLLEGE_LIST_STATUSES } from "@/lib/college-programs/list"
import { mapSchoolIdFor } from "@/lib/college-programs/load"

/**
 * What messaging does beyond send and read (Matt, 15 Oct 2026, from ChatGPT's spec): edit and
 * unsend within 15 minutes, reactions, reply to a message, "Seen", attachments, search, and each
 * conversation tied to its college so the family's list moves on its own.
 *
 * Safety first, because most wrestlers are minors:
 * - Edit and unsend keep the original in coach_message_edits, readable by staff only. An unsent
 *   message is hidden from the family and the coach, never deleted.
 * - Attachments live in a private bucket and are only ever handed out as short-lived signed links
 *   to people in the conversation.
 *
 * Needs scripts/add-coach-message-extras.sql. Until it is run, every extra reads as absent and
 * messaging works exactly as before (a select naming a missing column fails whole).
 */

export const EDIT_WINDOW_MS = 15 * 60 * 1000
export const REACTIONS = ["👍", "❤️", "🔥", "💪", "👏", "🙏"] as const
export const ATTACHMENT_BUCKET = "coach-message-files"
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
}

let available: { value: boolean; at: number } | null = null
/** Whether the extras' columns and tables exist yet; re-checked every minute until they do. */
export async function extrasAvailable(admin: SupabaseClient): Promise<boolean> {
  if (available && (available.value || Date.now() - available.at < 60_000)) return available.value
  const [{ error: a }, { error: b }] = await Promise.all([
    admin.from("coach_messages").select("edited_at, unsent_at, reply_to_id, attachment").limit(1),
    admin.from("coach_message_reactions").select("message_id").limit(1),
  ])
  available = { value: !a && !b, at: Date.now() }
  return available.value
}

export type Attachment = { path: string; name: string; type: string; size: number }
export type MessageExtras = {
  editedAt: string | null
  unsent: boolean
  replyTo: { id: string; senderName: string; body: string } | null
  reactions: Array<{ emoji: string; count: number; mine: boolean }>
  attachment: { name: string; type: string; size: number; url: string | null } | null
  /** For your own messages: the other side has opened the conversation since you sent it. */
  seen: boolean
}

type BaseMessage = { id: string; body: string; senderRole: string; senderName: string; createdAt: string; mine: boolean }

/** Adds edits, unsends, replies, reactions, attachments and "Seen" to a conversation's messages. */
export async function decorateMessages<M extends BaseMessage>(
  admin: SupabaseClient,
  thread: { id: string; coach_user_id: string; athlete_id: string },
  messages: M[],
  userId: string,
  role: ThreadRole,
): Promise<Array<M & MessageExtras>> {
  const none = (m: M): M & MessageExtras => ({ ...m, editedAt: null, unsent: false, replyTo: null, reactions: [], attachment: null, seen: false })
  if (!messages.length || !(await extrasAvailable(admin))) return messages.map(none)

  const ids = messages.map((m) => m.id)
  const family = await familyOf(admin, thread.athlete_id)
  const familyIds = [family.athleteUserId, ...family.parentUserIds].filter((id): id is string => Boolean(id))
  const [{ data: extra }, { data: reactions }, { data: reads }] = await Promise.all([
    admin.from("coach_messages").select("id, edited_at, unsent_at, reply_to_id, attachment").in("id", ids),
    admin.from("coach_message_reactions").select("message_id, user_id, emoji").in("message_id", ids),
    admin.from("coach_thread_reads").select("user_id, last_read_at").eq("thread_id", thread.id),
  ])
  const byId = new Map((extra ?? []).map((r) => [String(r.id), r]))
  const readAt = new Map((reads ?? []).map((r) => [String(r.user_id), String(r.last_read_at)]))
  // "Seen" by the other side: the coach for the family's messages, anyone in the family for the coach's.
  const otherSideRead = (mine: BaseMessage) => {
    const others = role === "coach" ? familyIds : [thread.coach_user_id]
    return others.some((id) => (readAt.get(id) ?? "") >= mine.createdAt)
  }
  const staff = role === "admin"
  const base = new Map(messages.map((m) => [m.id, m]))

  return Promise.all(
    messages.map(async (m) => {
      const x = byId.get(m.id)
      const unsent = Boolean(x?.unsent_at)
      const replyId = (x?.reply_to_id as string | null) ?? null
      const replied = replyId ? base.get(replyId) : null
      const repliedUnsent = replyId ? Boolean(byId.get(replyId)?.unsent_at) : false
      const att = (x?.attachment as Attachment | null) ?? null
      let url: string | null = null
      if (att && (!unsent || staff)) {
        const { data } = await admin.storage.from(ATTACHMENT_BUCKET).createSignedUrl(att.path, 60 * 30)
        url = data?.signedUrl ?? null
      }
      const mine = (reactions ?? []).filter((r) => String(r.message_id) === m.id)
      const counts = new Map<string, { count: number; mine: boolean }>()
      for (const r of mine) {
        const c = counts.get(String(r.emoji)) ?? { count: 0, mine: false }
        counts.set(String(r.emoji), { count: c.count + 1, mine: c.mine || r.user_id === userId })
      }
      return {
        ...m,
        // Staff reviewing a report read what was actually sent; everyone else sees it was unsent.
        body: unsent && !staff ? "" : m.body,
        editedAt: (x?.edited_at as string | null) ?? null,
        unsent,
        replyTo: replied ? { id: replied.id, senderName: replied.senderName, body: repliedUnsent && !staff ? "Message unsent" : replied.body.slice(0, 140) } : null,
        reactions: unsent ? [] : REACTIONS.filter((e) => counts.has(e)).map((e) => ({ emoji: e, ...counts.get(e)! })),
        attachment: att && (!unsent || staff) ? { name: att.name, type: att.type, size: att.size, url } : null,
        seen: m.mine && otherSideRead(m),
      }
    }),
  )
}

type Outcome = { ok: true } | { ok: false; status: number; error: string }

async function ownMessage(admin: SupabaseClient, threadId: string, messageId: string, userId: string) {
  const { data: m } = await admin.from("coach_messages").select("id, thread_id, sender_user_id, body, created_at, unsent_at").eq("id", messageId).eq("thread_id", threadId).maybeSingle()
  if (!m) return { error: { ok: false, status: 404, error: "That message does not exist." } as Outcome }
  if (m.sender_user_id !== userId) return { error: { ok: false, status: 403, error: "You can only change your own messages." } as Outcome }
  if (m.unsent_at) return { error: { ok: false, status: 400, error: "That message was unsent." } as Outcome }
  if (Date.now() - new Date(String(m.created_at)).getTime() > EDIT_WINDOW_MS) return { error: { ok: false, status: 403, error: "Messages can be changed for 15 minutes after sending." } as Outcome }
  return { message: m }
}

/** Edit your own message within 15 minutes. The original is kept for staff. */
export async function editMessage(admin: SupabaseClient, threadId: string, messageId: string, userId: string, body: string): Promise<Outcome> {
  if (!(await extrasAvailable(admin))) return { ok: false, status: 503, error: "Editing is not switched on yet." }
  const text = body.trim()
  if (!text || text.length > 4000) return { ok: false, status: 400, error: "Write between 1 and 4,000 characters." }
  const got = await ownMessage(admin, threadId, messageId, userId)
  if (got.error) return got.error
  if (got.message.body === text) return { ok: true }
  const { error: audit } = await admin.from("coach_message_edits").insert({ message_id: messageId, thread_id: threadId, editor_user_id: userId, action: "edit", previous_body: got.message.body })
  if (audit) return { ok: false, status: 500, error: "Could not save. Try again." }
  const { error } = await admin.from("coach_messages").update({ body: text, edited_at: new Date().toISOString() }).eq("id", messageId)
  return error ? { ok: false, status: 500, error: "Could not save. Try again." } : { ok: true }
}

/** Unsend your own message within 15 minutes: hidden from everyone in the conversation, kept for staff. */
export async function unsendMessage(admin: SupabaseClient, threadId: string, messageId: string, userId: string): Promise<Outcome> {
  if (!(await extrasAvailable(admin))) return { ok: false, status: 503, error: "Unsend is not switched on yet." }
  const got = await ownMessage(admin, threadId, messageId, userId)
  if (got.error) return got.error
  const { error: audit } = await admin.from("coach_message_edits").insert({ message_id: messageId, thread_id: threadId, editor_user_id: userId, action: "unsend", previous_body: got.message.body })
  if (audit) return { ok: false, status: 500, error: "Could not unsend. Try again." }
  const { error } = await admin.from("coach_messages").update({ unsent_at: new Date().toISOString() }).eq("id", messageId)
  return error ? { ok: false, status: 500, error: "Could not unsend. Try again." } : { ok: true }
}

/** Add or take back a reaction. Anyone in the conversation may react; staff reviewing may not. */
export async function toggleReaction(admin: SupabaseClient, threadId: string, messageId: string, userId: string, emoji: string): Promise<Outcome> {
  if (!(REACTIONS as readonly string[]).includes(emoji)) return { ok: false, status: 400, error: "Unknown reaction." }
  if (!(await extrasAvailable(admin))) return { ok: false, status: 503, error: "Reactions are not switched on yet." }
  const { data: thread } = await admin.from("coach_threads").select("coach_user_id, athlete_id").eq("id", threadId).maybeSingle()
  if (!thread) return { ok: false, status: 404, error: "That conversation does not exist." }
  const role = await roleInThread(admin, thread as { coach_user_id: string; athlete_id: string }, userId)
  if (!role || role === "admin") return { ok: false, status: 403, error: "You are not part of this conversation." }
  const { data: m } = await admin.from("coach_messages").select("id").eq("id", messageId).eq("thread_id", threadId).maybeSingle()
  if (!m) return { ok: false, status: 404, error: "That message does not exist." }
  const { data: existing } = await admin.from("coach_message_reactions").select("message_id").eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji).maybeSingle()
  const { error } = existing
    ? await admin.from("coach_message_reactions").delete().eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji)
    : await admin.from("coach_message_reactions").insert({ message_id: messageId, user_id: userId, emoji })
  return error ? { ok: false, status: 500, error: "Could not react. Try again." } : { ok: true }
}

/** A signed upload slot for one attachment in this conversation. The file goes straight to storage. */
export async function attachmentUploadSlot(
  admin: SupabaseClient,
  threadId: string,
  userId: string,
  file: { name: unknown; type: unknown; size: unknown },
): Promise<{ ok: true; path: string; token: string } | { ok: false; status: number; error: string }> {
  if (!(await extrasAvailable(admin))) return { ok: false, status: 503, error: "Attachments are not switched on yet." }
  const type = String(file.type ?? "")
  const size = Number(file.size)
  if (!ATTACHMENT_TYPES[type]) return { ok: false, status: 400, error: "Attach a PDF or a photo." }
  if (!Number.isFinite(size) || size <= 0 || size > ATTACHMENT_MAX_BYTES) return { ok: false, status: 400, error: "Files can be up to 10 MB." }
  const { data: thread } = await admin.from("coach_threads").select("coach_user_id, athlete_id, stopped_at").eq("id", threadId).maybeSingle()
  if (!thread) return { ok: false, status: 404, error: "That conversation does not exist." }
  const role = await roleInThread(admin, thread as { coach_user_id: string; athlete_id: string }, userId)
  if (!role || role === "admin") return { ok: false, status: 403, error: "You are not part of this conversation." }
  if (role === "coach" && thread.stopped_at) return { ok: false, status: 403, error: "This family has turned off messages from you." }
  const path = `${threadId}/${crypto.randomUUID()}.${ATTACHMENT_TYPES[type]}`
  const { data, error } = await admin.storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, status: 500, error: "Could not prepare the upload." }
  return { ok: true, path, token: data.token }
}

/** An attachment named on a send: only a file uploaded into this conversation, of an allowed type. */
export function cleanAttachment(threadId: string, raw: unknown): Attachment | null {
  if (!raw || typeof raw !== "object") return null
  const a = raw as Record<string, unknown>
  const path = String(a.path ?? "")
  const type = String(a.type ?? "")
  const size = Number(a.size)
  if (!path.startsWith(`${threadId}/`) || path.includes("..") || !ATTACHMENT_TYPES[type] || !(size > 0 && size <= ATTACHMENT_MAX_BYTES)) return null
  return { path, type, size, name: String(a.name ?? "Attachment").replace(/[\\/]/g, "").slice(0, 120) || "Attachment" }
}

/** After a send: the reply it answers and its file, once the extras are switched on. */
export async function saveMessageExtras(admin: SupabaseClient, threadId: string, messageId: string, extras: { replyToId?: unknown; attachment?: unknown }) {
  if (!(await extrasAvailable(admin))) return
  const patch: Record<string, unknown> = {}
  if (typeof extras.replyToId === "string" && extras.replyToId) {
    const { data } = await admin.from("coach_messages").select("id").eq("id", extras.replyToId).eq("thread_id", threadId).maybeSingle()
    if (data) patch.reply_to_id = data.id
  }
  const attachment = cleanAttachment(threadId, extras.attachment)
  if (attachment) patch.attachment = attachment
  if (Object.keys(patch).length) await admin.from("coach_messages").update(patch).eq("id", messageId)
}

/** The college a coach's conversation is with, as a college on the map; null when it cannot be placed. */
export async function collegeIdForCoach(admin: SupabaseClient, coachUserId: string, program: string | null): Promise<string | null> {
  const { data: profile } = await admin.from("user_profiles").select("school_id").eq("user_id", coachUserId).maybeSingle()
  if (profile?.school_id) {
    const { data: school } = await admin.from("schools").select("name").eq("id", profile.school_id).maybeSingle()
    const id = school?.name ? mapSchoolIdFor(String(school.name)) : null
    if (id) return id
  }
  return program ? mapSchoolIdFor(program) : null
}

const TALKING = COLLEGE_LIST_STATUSES.indexOf("talking")

/**
 * A coach wrote: the college goes on every family member's list at "Coach replied", or moves up to
 * it. It never moves a college backwards (a family at Visited or Offer stays there).
 */
export async function moveListsOnCoachMessage(admin: SupabaseClient, threadId: string) {
  const { data: thread } = await admin.from("coach_threads").select("coach_user_id, athlete_id, program").eq("id", threadId).maybeSingle()
  if (!thread) return
  const collegeId = await collegeIdForCoach(admin, String(thread.coach_user_id), (thread.program as string | null) ?? null)
  if (!collegeId) return
  const family = await familyOf(admin, String(thread.athlete_id))
  const users = [family.athleteUserId, ...family.parentUserIds].filter((id): id is string => Boolean(id))
  if (!users.length) return
  const { data: rows } = await admin.from("college_list_items").select("user_id, status").eq("school_id", collegeId).in("user_id", users)
  const at = new Map((rows ?? []).map((r) => [String(r.user_id), String(r.status)]))
  const now = new Date().toISOString()
  const writes = users
    .filter((u) => !at.has(u) || COLLEGE_LIST_STATUSES.indexOf(at.get(u) as (typeof COLLEGE_LIST_STATUSES)[number]) < TALKING)
    .map((u) => ({ user_id: u, school_id: collegeId, status: "talking", updated_at: now }))
  if (writes.length) await admin.from("college_list_items").upsert(writes, { onConflict: "user_id,school_id" })
}

/** Messages in this account's conversations whose words match, newest first. */
export async function searchMessages(admin: SupabaseClient, threadIds: string[], query: string): Promise<Array<{ threadId: string; messageId: string; body: string; createdAt: string }>> {
  const q = query.trim().replace(/[%_,()]/g, " ").slice(0, 80)
  if (q.length < 2 || !threadIds.length) return []
  const unsentFilter = (await extrasAvailable(admin)) ? (b: ReturnType<typeof base>) => b.is("unsent_at", null) : (b: ReturnType<typeof base>) => b
  const base = () => admin.from("coach_messages").select("id, thread_id, body, created_at").in("thread_id", threadIds).ilike("body", `%${q}%`)
  const { data } = await unsentFilter(base()).order("created_at", { ascending: false }).limit(30)
  return (data ?? []).map((m) => ({ threadId: String(m.thread_id), messageId: String(m.id), body: String(m.body).slice(0, 200), createdAt: String(m.created_at) }))
}

export type ThreadCollege = {
  id: string
  name: string
  city: string
  state: string
  division: string | null
  conference: string | null
  /** The viewer's own list stage for this college, if it is on their list. */
  listStatus: string | null
  note: string | null
}

/** The college beside a family's conversation, with where it sits on their list. */
export async function threadCollege(admin: SupabaseClient, coachUserId: string, program: string | null, userId: string): Promise<ThreadCollege | null> {
  const id = await collegeIdForCoach(admin, coachUserId, program)
  if (!id) return null
  const { default: data } = await import("@/lib/college-programs/programs-2026-27.json")
  const school = (data.schools as Array<{ id: string; name: string; city: string; state: string; programs: Array<{ division: string; conference: string | null }> }>).find((s) => s.id === id)
  if (!school) return null
  const { data: item } = await admin.from("college_list_items").select("status, note").eq("user_id", userId).eq("school_id", id).maybeSingle()
  return {
    id,
    name: school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
    city: school.city,
    state: school.state,
    division: school.programs[0]?.division ?? null,
    conference: school.programs[0]?.conference ?? null,
    listStatus: (item?.status as string | null) ?? null,
    note: (item?.note as string | null) ?? null,
  }
}

/** Which of these messages were unsent, so a list preview never shows one. */
export async function unsentIds(admin: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (!ids.length || !(await extrasAvailable(admin))) return new Set()
  const { data } = await admin.from("coach_messages").select("id").in("id", ids).not("unsent_at", "is", null)
  return new Set((data ?? []).map((r) => String(r.id)))
}
