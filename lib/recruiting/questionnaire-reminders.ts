import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { sendToTokens } from "@/lib/push-send"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"

/**
 * The weekly interest-form nudge (Matt, 22 Oct 2026: "reminders to fill out the form with a push
 * button"). One push per family with Command Center access whose list has colleges with a form on
 * file and no "Submitted" yet; the tap opens the Interest forms page in the app.
 *
 * Nothing is sent until QUESTIONNAIRE_REMINDER_SEND=1 (Matt approves the wording first), and the
 * app must already carry the /questionnaires route the tap opens (push taps need a route in the
 * bundle phones run). Sent to phones with "College interest" alerts on - the same switch as a
 * program viewing the profile, since both are the family's own recruiting.
 */

const SCHOOL_NAMES = new Map([...(data.schools as Array<{ id: string; name: string }>), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()]))
/** A college saved in the last two days is not nagged about yet. */
const GRACE_MS = 2 * 864e5

export type QuestionnaireReminder = { userId: string; firstName: string; schools: string[]; title: string; body: string }

export function reminderText(firstName: string, schools: string[]): { title: string; body: string } {
  const n = schools.length
  const named = n <= 2 ? schools.join(" and ") : `${schools.slice(0, 2).join(", ")} and ${n - 2} more`
  return {
    title: n === 1 ? "1 interest form to fill" : `${n} interest forms to fill`,
    body: `${named} ${n === 1 ? "is" : "are"} on ${firstName}'s list still waiting on an interest form. Tap to fill ${n === 1 ? "it" : "them"} in a few minutes.`,
  }
}

export async function buildQuestionnaireReminders(admin: SupabaseClient, options: { now?: Date } = {}): Promise<QuestionnaireReminder[]> {
  const now = (options.now ?? new Date()).getTime()
  const rows: Array<{ user_id: string; school_id: string; status: string; updated_at: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await admin
      .from("college_list_items")
      .select("user_id, school_id, status, updated_at")
      .is("questionnaire_done_at", null)
      // Before a coach is talking with them. A coach's first message adds the college at "talking"
      // (lib/coach-messages-extras.ts); that coach already has the family, so no nudge.
      .in("status", ["interested", "contacted"])
      .order("user_id")
      .order("school_id")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((page ?? []) as typeof rows))
    if (!page || page.length < 1000) break
  }

  const byUser = new Map<string, typeof rows>()
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r])

  const graduated = mostRecentGraduatedClassYear()
  const out: QuestionnaireReminder[] = []
  for (const [userId, items] of byUser) {
    const ids = await familyAthleteIds(admin, userId)
    if (!ids.length) continue
    const { data: athletes } = await admin.from("athletes").select('id, name, "firstName", gender, graduationyear').in("id", ids).order("graduationyear", { ascending: true })
    const wrestler = (athletes ?? []).find((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    if (!wrestler) continue
    const side = /^f/i.test(String(wrestler.gender ?? "")) ? "womens" : "mens"
    const schools = items
      .filter((i) => now - Date.parse(i.updated_at) > GRACE_MS)
      .filter((i) => questionnairesForSchool(i.school_id).some((q) => q[side]))
      .map((i) => SCHOOL_NAMES.get(i.school_id))
      .filter((n): n is string => Boolean(n))
    if (!schools.length) continue
    const { viewer } = await resolveRankingViewerForUser({ admin, userId }).catch(() => ({ viewer: null }))
    if (!hasPortalAccess(viewer)) continue
    const firstName = String(wrestler.firstName ?? "").trim() || String(wrestler.name ?? "").trim().split(/\s+/)[0] || "your wrestler"
    out.push({ userId, firstName, schools, ...reminderText(firstName, schools) })
  }
  return out
}

export async function sendQuestionnaireReminders(
  admin: SupabaseClient,
  options: { dryRun: boolean },
): Promise<{ families: number; withPhones: number; sent: number; preview: Array<{ firstName: string; title: string; body: string }> }> {
  const reminders = await buildQuestionnaireReminders(admin)
  let withPhones = 0
  let sent = 0
  for (const r of reminders) {
    const { data: devices } = await admin.from("push_devices").select("expo_push_token").eq("user_id", r.userId).eq("alert_program_views", true)
    const tokens = [...new Set((devices ?? []).map((d) => (d as { expo_push_token: string }).expo_push_token).filter(Boolean))]
    if (!tokens.length) continue
    withPhones++
    if (options.dryRun) continue
    const result = await sendToTokens("alert_program_views", tokens, {
      title: r.title,
      body: r.body,
      // src/app/questionnaires.tsx in recruitnc-mobile opens the web page signed in.
      data: { kind: "questionnaires", path: "/questionnaires" },
    })
    sent += result.sent
  }
  return { families: reminders.length, withPhones, sent, preview: reminders.slice(0, 10).map(({ firstName, title, body }) => ({ firstName, title, body })) }
}
