import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { filterUnsubscribed, unsubscribeUrl } from "@/lib/email-unsubscribe"
import { sendToTokens } from "@/lib/push-send"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { reminderFromRow, reminderMessage, type Reminder } from "@/lib/recruiting/reminders"
import { BRAND_SITE, userBrand } from "@/lib/recruiting/user-brand"

/**
 * Sends the reminders families scheduled (lib/recruiting/reminders.ts), by app push and email.
 *
 * Nothing goes out until FAMILY_REMINDER_SEND=1 (Matt approves first); until then the cron only
 * counts what is due and leaves it unsent. A reminder more than a day late - one that came due
 * while sending was off - is closed without sending, so turning the flag on never fires a backlog
 * of stale reminders at once.
 */
const SCHOOL_NAMES = new Map([...(data.schools as Array<{ id: string; name: string }>), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s.name.replace(/\s*\([^)]*\)\s*/g, " ").trim()]))
const STALE_MS = 24 * 3600_000
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

/** The reminder email: the parent's own note, a link back, the brand's name. No questions. */
export function renderReminderEmail(r: Pick<Reminder, "note" | "topic">, ctx: { schoolName: string | null; wrestlerFirstName: string | null; brandName: string; site: string; unsubscribe: string }) {
  const link = `${ctx.site}/my-recruiting`
  const m = reminderMessage(r, { ...ctx, link })
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0A1628">
<div style="max-width:520px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:12px;padding:24px">
<p style="margin:0 0 12px;font-size:14px;color:#4b5563">${esc(m.lead)}</p>
<p style="margin:0 0 20px;font-size:18px;font-weight:700;line-height:1.4">${esc(r.note)}</p>
<a href="${esc(link)}" style="display:inline-block;background:#0A1628;color:#ffffff;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:8px">Open the Command Center</a>
<p style="margin:24px 0 0;font-size:14px">${esc(ctx.brandName)}</p>
</div>
<p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:16px">${esc(ctx.brandName)} · <a href="${esc(ctx.unsubscribe)}" style="color:#9ca3af">Unsubscribe</a></p>
</div></body></html>`
  return { subject: m.subject, html, text: `${m.text}\n\nUnsubscribe: ${ctx.unsubscribe}`, push: { title: m.title, body: m.body } }
}

export async function sendDueReminders(
  admin: SupabaseClient,
  options: { dryRun: boolean; now?: Date },
): Promise<{ due: number; sent: number; pushed: number; emailed: number; stale: number; skipped: number; preview: Array<{ title: string; body: string }> }> {
  const now = options.now ?? new Date()
  const { data: rows, error } = await admin.from("family_reminders").select("*").is("sent_at", null).lte("remind_at", now.toISOString()).order("remind_at").limit(200)
  if (error) {
    if (error.code === "42P01") return { due: 0, sent: 0, pushed: 0, emailed: 0, stale: 0, skipped: 0, preview: [] }
    throw new Error(error.message)
  }
  const due = (rows ?? []).map((r) => ({ r: reminderFromRow(r as Record<string, unknown>), userId: String((r as { user_id: string }).user_id) }))
  const out = { due: due.length, sent: 0, pushed: 0, emailed: 0, stale: 0, skipped: 0, preview: [] as Array<{ title: string; body: string }> }
  const close = (id: string) => admin.from("family_reminders").update({ sent_at: now.toISOString() }).eq("id", id)

  for (const { r, userId } of due) {
    const schoolName = r.schoolId ? (SCHOOL_NAMES.get(r.schoolId) ?? null) : null
    const { data: athlete } = r.athleteId ? await admin.from("athletes").select('"firstName", name').eq("id", r.athleteId).maybeSingle() : { data: null }
    const wrestlerFirstName = athlete ? String(athlete.firstName ?? "").trim() || String(athlete.name ?? "").split(" ")[0] || null : null
    const { data: account } = await admin.auth.admin.getUserById(userId)
    const brand = BRAND_SITE[userBrand(account?.user?.user_metadata)]
    // NC United's families get "NC United", never "NC United Wrestling" (Matt, 21 Oct 2026).
    const brandName = brand.name === "RecruitNC" ? "NC United" : brand.name
    const email = account?.user?.email ?? null
    const msg = renderReminderEmail(r, { schoolName, wrestlerFirstName, brandName, site: brand.url, unsubscribe: email ? unsubscribeUrl(brand.url, email) : brand.url })
    if (out.preview.length < 10) out.preview.push(msg.push)
    if (options.dryRun) continue

    if (now.getTime() - Date.parse(r.remindAt) > STALE_MS) {
      out.stale++
      await close(r.id)
      continue
    }
    // A family that has left the Command Center since scheduling it is not sent anything.
    const { viewer } = await resolveRankingViewerForUser({ admin, userId }).catch(() => ({ viewer: null }))
    if (!hasPortalAccess(viewer)) {
      out.skipped++
      await close(r.id)
      continue
    }
    // The family asked for this one, so every phone on the account gets it, whatever its alert switches.
    const { data: devices } = await admin.from("push_devices").select("expo_push_token").eq("user_id", userId)
    const tokens = [...new Set((devices ?? []).map((d) => (d as { expo_push_token: string }).expo_push_token).filter(Boolean))]
    if (tokens.length) {
      // "/" is the app's home: a route every bundle in the field has (push taps need a route in the old bundle).
      const res = await sendToTokens("alert_program_views", tokens, { ...msg.push, data: { kind: "reminder", path: "/" } }).catch(() => ({ sent: 0 }))
      if (res.sent) out.pushed++
    }
    if (email && process.env.RESEND_API_KEY) {
      const { allowed } = await filterUnsubscribed(admin, [email])
      if (allowed.length) {
        const { Resend } = await import("resend")
        const from = brand.name === "RecruitWrestlers" ? "RecruitWrestlers <info@ncwrestlingunited.com>" : "NC United <info@ncwrestlingunited.com>"
        const result = await new Resend(process.env.RESEND_API_KEY).emails
          .send({ from, to: [email], subject: msg.subject, html: msg.html, text: msg.text, headers: { "List-Unsubscribe": `<${unsubscribeUrl(brand.url, email)}>` } })
          .catch((e: unknown) => ({ error: e }))
        if (!(result as { error?: unknown }).error) out.emailed++
      }
    }
    await close(r.id)
    out.sent++
  }
  return out
}
