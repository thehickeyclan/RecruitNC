import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { coachLabel, displayName, familyOf, firstName } from "@/lib/coach-messages"
import { getAppBaseUrl } from "@/lib/news-share-formats"
import { sendToTokens } from "@/lib/push-send"
import { notifyStaffMessageReport } from "@/lib/staff-alerts-sms"

/**
 * Telling people a message arrived. The phone alert is the point of the whole feature; email
 * covers whoever is not signed in on the app.
 *
 * - **Never the message text.** Not on a lock screen (family phones get passed around) and not
 *   in an email (it makes the person sign in, which is where Report and Stop live).
 * - **The coach is named, with their program.** The program-view alert names only the school;
 *   here the family is about to talk to this person and needs to know who.
 * - **Push waits for the app.** A tap opens /messages/<id> in the app, and that route must be in
 *   the bundle phones already run before the first alert goes out (a tap on a route the bundle
 *   lacks lands on "Unmatched Route"). Until COACH_MESSAGES_PUSH=1, everyone gets email.
 *
 * Never throws: a failed alert must not fail the send that caused it.
 */

function pushEnabled(): boolean {
  const v = String(process.env.COACH_MESSAGES_PUSH ?? "").trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/** Push to every opted-in phone signed in as one of these accounts. Returns the accounts reached. */
async function pushTo(
  admin: SupabaseClient,
  userIds: string[],
  message: { title: string; body: string; threadId: string },
): Promise<Set<string>> {
  const reached = new Set<string>()
  if (!pushEnabled() || userIds.length === 0) return reached
  const { data: devices } = await admin
    .from("push_devices")
    .select("expo_push_token, user_id")
    .in("user_id", userIds)
    .eq("alert_messages", true)
  const rows = (devices ?? []) as Array<{ expo_push_token: string; user_id: string }>
  const tokens = [...new Set(rows.map((d) => d.expo_push_token).filter(Boolean))]
  if (tokens.length === 0) return reached
  const result = await sendToTokens("alert_messages", tokens, {
    title: message.title,
    body: message.body,
    data: { kind: "coach_message", threadId: message.threadId, path: `/messages/${message.threadId}` },
  })
  if (result.sent > 0) for (const r of rows) reached.add(r.user_id)
  return reached
}

async function emailsFor(admin: SupabaseClient, userIds: string[]): Promise<Array<{ userId: string; email: string; name: string }>> {
  if (userIds.length === 0) return []
  const { data } = await admin.from("user_profiles").select("user_id, email, full_name, first_name, last_name").in("user_id", userIds)
  return (data ?? [])
    .map((p) => ({ userId: String(p.user_id), email: String(p.email ?? "").trim(), name: displayName(p) }))
    .filter((p) => p.email.includes("@"))
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function sendEmail(to: string, subject: string, lines: { headline: string; detail: string; url: string; cta: string; footer?: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[coach-messages] RESEND_API_KEY not configured; skipped email to", to)
    return
  }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#f8fafc;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
<p style="color:#9a7b2f;font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0;">NC United · RecruitNC</p>
<h1 style="color:#0A1628;font-size:22px;margin:8px 0 12px;">${escapeHtml(lines.headline)}</h1>
<p>${escapeHtml(lines.detail)}</p>
<p style="margin:24px 0;"><a href="${escapeHtml(lines.url)}" style="display:inline-block;background:#0A1628;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">${escapeHtml(lines.cta)}</a></p>
${lines.footer ? `<p style="color:#64748b;font-size:14px;">${escapeHtml(lines.footer)}</p>` : ""}
<p style="color:#64748b;font-size:13px;margin-top:24px;">Questions or concerns? <a href="mailto:info@ncwrestlingunited.com">info@ncwrestlingunited.com</a></p>
</div></body></html>`
  const result = await resend.emails.send({ from: "NC Wrestling United <info@ncwrestlingunited.com>", to: [to], subject, html })
  if (result.error) console.error("[coach-messages] email", result.error)
}

/** Called after a message is saved. Tells the other side of the conversation. */
export async function notifyNewMessage(
  admin: SupabaseClient,
  input: { threadId: string; senderUserId: string; senderRole: "coach" | "athlete" | "parent" },
): Promise<void> {
  try {
    const { data: thread } = await admin
      .from("coach_threads")
      .select("id, coach_user_id, athlete_id, program")
      .eq("id", input.threadId)
      .maybeSingle()
    if (!thread) return
    const [{ data: athlete }, { data: coach }] = await Promise.all([
      admin.from("athletes").select("name").eq("id", thread.athlete_id).maybeSingle(),
      admin.from("user_profiles").select("full_name, first_name, last_name").eq("user_id", thread.coach_user_id).maybeSingle(),
    ])
    const wrestler = firstName(athlete?.name as string | null)
    const coachName = coachLabel(displayName(coach))
    const from = thread.program ? `${coachName} from ${thread.program}` : coachName
    const url = `${getAppBaseUrl()}/inbox/${thread.id}`

    if (input.senderRole === "coach") {
      const family = await familyOf(admin, String(thread.athlete_id))
      const recipients = [family.athleteUserId, ...family.parentUserIds].filter((id): id is string => Boolean(id))
      const pushed = await pushTo(admin, recipients, {
        title: "New message",
        body: `${from} sent ${wrestler} a message.`,
        threadId: thread.id,
      })
      const emailTo = (await emailsFor(admin, recipients.filter((id) => !pushed.has(id))))
      for (const r of emailTo) {
        await sendEmail(r.email, `${from} sent ${wrestler} a message`, {
          headline: `${from} sent ${wrestler} a message`,
          detail: `Sign in to read it and reply. ${wrestler} and every parent linked to the profile see the same conversation.`,
          url,
          cta: "Read the message",
          footer: "Get these on your phone: download the NC United app and sign in with this email.",
        })
      }
      return
    }

    // The family replied: tell the coach.
    const who = input.senderRole === "athlete" ? wrestler : `${wrestler}'s parent`
    await pushTo(admin, [thread.coach_user_id], { title: "Reply from a recruit", body: `${who} replied to your message.`, threadId: thread.id })
    // Coaches work on the web; they always get the email.
    for (const r of await emailsFor(admin, [thread.coach_user_id])) {
      await sendEmail(r.email, `${who} replied to your message`, {
        headline: `${who} replied`,
        detail: `Your conversation about ${athlete?.name ?? "this wrestler"} has a new reply.`,
        url,
        cta: "Open the conversation",
      })
    }
  } catch (e) {
    console.error("[coach-messages] notify", e instanceof Error ? e.message : e)
  }
}

/** A report was filed: staff get a text, because the clock is 24 hours. */
export async function notifyReport(admin: SupabaseClient, input: { reportId: string; threadId: string }): Promise<void> {
  try {
    const { data: thread } = await admin.from("coach_threads").select("program, athlete_id").eq("id", input.threadId).maybeSingle()
    const { data: athlete } = thread
      ? await admin.from("athletes").select("name").eq("id", thread.athlete_id).maybeSingle()
      : { data: null }
    await notifyStaffMessageReport({ program: (thread?.program as string | null) ?? null, athleteName: (athlete?.name as string | null) ?? null })
  } catch (e) {
    console.error("[coach-messages] report notify", e instanceof Error ? e.message : e)
  }
}
