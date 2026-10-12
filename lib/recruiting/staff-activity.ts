import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { BOARD_EVENTS_TABLE } from "@/lib/recruiting/board-events"

/**
 * Staff activity: one list, newest first, of what the program's coaches did on the shared board
 * and who did it. Read from where each thing is already recorded (see board-events.ts):
 * stars (added), board events (added, removed, stage, applied), logged contacts, and platform
 * messages in both directions.
 */
export type StaffActivityItem = {
  id: string
  at: string
  /** The coach, "You" for the viewer, or the wrestler's name on a reply. */
  by: string
  kind: "added" | "removed" | "stage" | "applied" | "contact" | "message" | "reply"
  athleteId: string
  athleteName: string
  /** The rest of the sentence after the name: "moved Gavin Hickey from Prospect to Contacted". */
  text: string
}

const CONTACT: Record<string, string> = {
  call: "logged a call with",
  text: "logged a text to",
  email: "logged an email to",
  visit: "logged a visit with",
  letter: "logged a letter to",
  social_media: "logged a social media contact with",
  watched_live: "logged watching",
  prospect_camp: "logged a camp with",
  event: "logged an event with",
}

export async function loadStaffActivity(admin: SupabaseClient, userId: string, limit = 50): Promise<StaffActivityItem[]> {
  const { data: me } = await admin.from("user_profiles").select("school_id").eq("user_id", userId).maybeSingle()
  let staff: Array<{ user_id: string; full_name: string | null }> = [{ user_id: userId, full_name: null }]
  if (me?.school_id) {
    const { data } = await admin.from("user_profiles").select("user_id, full_name").eq("school_id", me.school_id)
    if (data?.length) staff = data as typeof staff
  }
  const staffIds = [...new Set([userId, ...staff.map((s) => String(s.user_id))])]
  const who = new Map(staff.map((s) => [String(s.user_id), s.full_name?.trim() || "A coach"]))
  const by = (id: string) => (id === userId ? "You" : (who.get(id) ?? "A coach"))

  const [stars, events, actions, threads] = await Promise.all([
    admin.from("college_coach_stars").select("id, athlete_id, coach_user_id, starred_at").in("coach_user_id", staffIds).order("starred_at", { ascending: false }).limit(limit),
    // Missing until its SQL is run: the list then shows everything else.
    admin.from(BOARD_EVENTS_TABLE).select("id, actor_user_id, athlete_id, kind, detail, created_at").in("actor_user_id", staffIds).order("created_at", { ascending: false }).limit(limit),
    admin.from("recruiting_actions").select("id, athlete_id, coach_user_id, action_type, action_date, created_at").in("coach_user_id", staffIds).order("created_at", { ascending: false }).limit(limit),
    admin.from("coach_threads").select("id, athlete_id, coach_user_id").in("coach_user_id", staffIds),
  ])
  const threadOf = new Map((threads.data ?? []).map((t) => [String(t.id), t]))
  const messages = threadOf.size
    ? await admin.from("coach_messages").select("id, thread_id, sender_role, sender_user_id, created_at").in("thread_id", [...threadOf.keys()]).order("created_at", { ascending: false }).limit(limit)
    : { data: [] as Array<{ id: string; thread_id: string; sender_role: string; sender_user_id: string | null; created_at: string }> }

  type Draft = Omit<StaffActivityItem, "athleteName" | "by"> & { actor: string | null }
  const drafts: Draft[] = []

  // A star and the line written when it was made are the same add; within two minutes, show one.
  const loggedAdds: Array<{ key: string; at: number }> = []
  for (const e of events.data ?? []) {
    const kind = e.kind as StaffActivityItem["kind"]
    if (kind === "added") loggedAdds.push({ key: `${e.actor_user_id}|${e.athlete_id}`, at: Date.parse(String(e.created_at)) })
    const text =
      kind === "added" ? "added {name} to the board"
      : kind === "removed" ? "took {name} off the board"
      : kind === "stage" ? `moved {name} ${e.detail ?? "to a new stage"}`
      : kind === "applied" ? (e.detail === "cleared" ? "marked {name} as not applied" : "marked {name} as applied")
      : "updated {name}"
    drafts.push({ id: `e-${e.id}`, at: String(e.created_at), actor: String(e.actor_user_id), kind, athleteId: String(e.athlete_id), text })
  }
  for (const s of stars.data ?? []) {
    if (!s.starred_at) continue
    const at = Date.parse(String(s.starred_at))
    if (loggedAdds.some((l) => l.key === `${s.coach_user_id}|${s.athlete_id}` && Math.abs(l.at - at) < 120_000)) continue
    drafts.push({ id: `s-${s.id}`, at: String(s.starred_at), actor: String(s.coach_user_id), kind: "added", athleteId: String(s.athlete_id), text: "added {name} to the board" })
  }
  for (const a of actions.data ?? []) {
    const verb = CONTACT[String(a.action_type)] ?? "logged a contact with"
    drafts.push({ id: `a-${a.id}`, at: String(a.created_at ?? a.action_date), actor: String(a.coach_user_id), kind: "contact", athleteId: String(a.athlete_id), text: `${verb} {name}` })
  }
  for (const m of messages.data ?? []) {
    const t = threadOf.get(String(m.thread_id))
    if (!t) continue
    const fromCoach = m.sender_role === "coach"
    drafts.push({
      id: `m-${m.id}`,
      at: String(m.created_at),
      actor: fromCoach ? String(m.sender_user_id ?? t.coach_user_id) : null,
      kind: fromCoach ? "message" : "reply",
      athleteId: String(t.athlete_id),
      text: fromCoach ? "messaged {name}" : "replied to your staff",
    })
  }

  const top = drafts.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit)
  const ids = [...new Set(top.map((d) => d.athleteId))]
  const { data: athletes } = ids.length ? await admin.from("athletes").select("id, name").in("id", ids) : { data: [] }
  const nameOf = new Map((athletes ?? []).map((a) => [String(a.id), String(a.name ?? "").trim() || "a wrestler"]))

  return top.map(({ actor, ...d }) => {
    const athleteName = nameOf.get(d.athleteId) ?? "a wrestler"
    return { ...d, athleteName, by: actor ? by(actor) : athleteName, text: d.text.replace("{name}", athleteName) }
  })
}
