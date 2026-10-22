import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { collegeIdForCoach } from "@/lib/coach-messages-extras"
import { listThreads } from "@/lib/coach-messages"
import type { Inbound } from "@/lib/college-programs/board-activities"
import { CONTACT_LABEL, summarizeContacts } from "@/lib/college-programs/contacts"
import { loadCollegeContacts } from "@/lib/college-programs/contacts-server"
import { collegeViewsFor } from "@/lib/recruiting/college-views"

/**
 * What came in from each college on a family's list: program views of the profile, a coach's
 * conversation (and whose turn it is), the latest contact the family logged. Verified from our own
 * records. One loader so the board, the Command Center home and Today's moves agree.
 */
export async function loadListInbound(admin: SupabaseClient, viewerId: string, athleteIds: string[]): Promise<Map<string, Inbound>> {
  const [views, threads, contacts] = await Promise.all([
    collegeViewsFor(admin, athleteIds).catch(() => new Map()),
    listThreads(admin, viewerId).catch(() => []),
    loadCollegeContacts(admin, athleteIds).catch(() => []),
  ])
  const reach = summarizeContacts(contacts)
  const { data: threadRows } = threads.length ? await admin.from("coach_threads").select("id, coach_user_id, program").in("id", threads.map((t) => t.id)) : { data: [] }
  const message = new Map<string, { threadId: string; yourTurn: boolean; at: string | null }>()
  for (const row of threadRows ?? []) {
    const collegeId = await collegeIdForCoach(admin, String(row.coach_user_id), (row.program as string | null) ?? null).catch(() => null)
    const t = threads.find((x) => x.id === row.id)
    if (collegeId && t && (!message.has(collegeId) || t.yourTurn)) message.set(collegeId, { threadId: t.id, yourTurn: t.yourTurn, at: t.lastMessageAt ?? null })
  }
  const out = new Map<string, Inbound>()
  const ids = new Set<string>([...views.keys(), ...message.keys(), ...reach.bySchool.keys()])
  for (const id of ids) {
    const v = views.get(id)
    const r = reach.bySchool.get(id)
    out.set(id, {
      views: v ? { count: v.views, last: v.lastViewedAt } : null,
      message: message.get(id) ?? null,
      contact: r ? { label: CONTACT_LABEL[r.latest.kind], date: new Date(`${r.latest.happenedOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), on: r.latest.happenedOn } : null,
    })
  }
  return out
}
