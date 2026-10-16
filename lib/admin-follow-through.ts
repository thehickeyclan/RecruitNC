import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { collegeForCoach } from "@/lib/college-domain-schools"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { CONTACT_LABEL, isContactKind, type ContactKind } from "@/lib/college-programs/contacts"
import data from "@/lib/college-programs/programs-2026-27.json"

/**
 * Follow-through: what happens after a college coach finds a wrestler (Matt, 16 Oct 2026).
 * Two sides, both off the site in reality: a verified coach tapping Call, Text or Email
 * (`coach_contact_tap`), and a family logging that a college reached out (`college_contacts`).
 */
export type FollowThrough = {
  taps: { total: number; wrestlers: number; programs: number; byChannel: Record<"call" | "text" | "email", number> }
  family: {
    total: number
    families: number
    wrestlers: number
    colleges: number
    byKind: Partial<Record<ContactKind, number>>
    recent: Array<{ school: string; kind: string; wrestler: string; on: string }>
  }
}

const SCHOOL_NAME = new Map([...(data.schools as Array<{ id: string; name: string }>), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()]))

export async function loadFollowThrough(admin: SupabaseClient, since: string | null): Promise<FollowThrough> {
  // Coach taps
  const taps: Array<{ user_id: string; athlete_id: string; channel: string }> = []
  for (let from = 0; ; from += 1000) {
    let q = admin.from("user_analytics").select("user_id, event_data").eq("event_type", "coach_contact_tap").range(from, from + 999)
    if (since) q = q.gte("created_at", since)
    const { data: rows, error } = await q
    if (error) break
    for (const r of rows ?? []) {
      const d = (r.event_data ?? {}) as { athlete_id?: string; channel?: string }
      if (r.user_id && d.athlete_id) taps.push({ user_id: String(r.user_id), athlete_id: d.athlete_id, channel: String(d.channel ?? "") })
    }
    if ((rows ?? []).length < 1000) break
  }
  const coachIds = [...new Set(taps.map((t) => t.user_id))]
  const programs = new Set<string>()
  for (let i = 0; i < coachIds.length; i += 100) {
    const { data: coaches } = await admin.from("user_profiles").select("user_id, email, institution").in("user_id", coachIds.slice(i, i + 100))
    for (const c of coaches ?? []) {
      const college = collegeForCoach({ institution: c.institution as string, email: c.email as string })
      programs.add(college ?? `coach:${c.user_id}`)
    }
  }
  const byChannel = { call: 0, text: 0, email: 0 }
  for (const t of taps) if (t.channel in byChannel) byChannel[t.channel as keyof typeof byChannel] += 1

  // Family-logged contacts
  let q = admin.from("college_contacts").select("user_id, athlete_id, school_id, kind, happened_on, created_at").order("created_at", { ascending: false }).limit(5000)
  if (since) q = q.gte("created_at", since)
  const { data: contacts } = await q
  const rows = (contacts ?? []).filter((c) => isContactKind(c.kind))
  const byKind: Partial<Record<ContactKind, number>> = {}
  for (const c of rows) byKind[c.kind as ContactKind] = (byKind[c.kind as ContactKind] ?? 0) + 1
  const recentRows = rows.slice(0, 12)
  const ids = [...new Set(recentRows.map((c) => String(c.athlete_id)))]
  const { data: names } = ids.length ? await admin.from("athletes").select("id, name").in("id", ids) : { data: [] }
  const nameOf = new Map((names ?? []).map((a) => [String(a.id), String(a.name ?? "")]))

  return {
    taps: { total: taps.length, wrestlers: new Set(taps.map((t) => t.athlete_id)).size, programs: programs.size, byChannel },
    family: {
      total: rows.length,
      families: new Set(rows.map((c) => String(c.user_id))).size,
      wrestlers: new Set(rows.map((c) => String(c.athlete_id))).size,
      colleges: new Set(rows.map((c) => String(c.school_id))).size,
      byKind,
      recent: recentRows.map((c) => ({
        school: SCHOOL_NAME.get(String(c.school_id)) ?? String(c.school_id),
        kind: CONTACT_LABEL[c.kind as ContactKind],
        wrestler: nameOf.get(String(c.athlete_id)) ?? "",
        on: String(c.happened_on),
      })),
    },
  }
}
