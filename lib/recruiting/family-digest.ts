import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { familyOf, unreadCount } from "@/lib/coach-messages"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { filterUnsubscribed, unsubscribeUrl } from "@/lib/email-unsubscribe"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { hasPortalAccess, hasPremiumAccess } from "@/lib/ranking-visibility"

/**
 * The weekly family email (17 Oct 2026): "college coaches looked at your wrestler this week".
 *
 * Coaches viewing NC wrestlers is the thing no other recruiting service can show, and until now a
 * family only saw it if they happened to log in. Sent only when something happened: views by
 * college coaches in the last seven days, or coach messages waiting. A family with a paid plan
 * gets the program names; a free family gets the count and the way to see them - the same rule
 * as everywhere else (names for a subscriber, the count for everyone).
 *
 * Sending is off until Matt approves it (FAMILY_DIGEST_SEND=1); until then the cron only counts.
 */

const DAY = 86_400_000
const SITE = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com").replace(/\/$/, "")

export type DigestTier = "free" | "rankings" | "portal"

export type FamilyDigest = {
  userId: string
  email: string
  athleteId: string
  wrestlerFirstName: string
  tier: DigestTier
  /** College-coach views of the profile in the window. */
  views: number
  /** Distinct programs that viewed in the window; names only for a paid plan. */
  programCount: number
  programs: string[]
  /** Programs viewing for the first time ever, inside the window; names only for a paid plan. */
  firstTime: string[]
  unreadMessages: number
}

/** Wrestlers a college coach looked at since `since`, from the profile-view log. */
async function viewedAthleteIds(admin: SupabaseClient, since: string): Promise<string[]> {
  const ids = new Set<string>()
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await admin
      .from("user_analytics")
      .select("event_data")
      .eq("event_type", "profile_view")
      .gte("created_at", since)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      const id = (row.event_data as { athlete_id?: string } | null)?.athlete_id
      if (id) ids.add(String(id))
    }
    if (!data || data.length < 1000) break
  }
  return [...ids]
}

/** Everyone who should hear about the last `days` days, one entry per family account per wrestler. */
export async function buildFamilyDigests(admin: SupabaseClient, options: { days?: number; now?: Date } = {}): Promise<FamilyDigest[]> {
  const now = options.now ?? new Date()
  const since = new Date(now.getTime() - (options.days ?? 7) * DAY).toISOString()
  const athleteIds = await viewedAthleteIds(admin, since)
  const out: FamilyDigest[] = []
  const tierCache = new Map<string, DigestTier>()
  const emailCache = new Map<string, string | null>()

  for (const athleteId of athleteIds) {
    // Coach views only: the same reading the family's Activity page uses.
    const summary = await getCoachViewsForAthlete(admin, athleteId).catch(() => null)
    const recent = (summary?.visits ?? []).filter((v) => v.at >= since)
    if (!summary || recent.length === 0) continue
    const programs = [...new Set(recent.map((v) => v.school).filter((s): s is string => Boolean(s)))]
    const firstTime = programs.filter((p) => {
      const earliest = summary.visits.filter((v) => v.school === p).map((v) => v.at).sort()[0]
      return earliest != null && earliest >= since
    })
    const family = await familyOf(admin, athleteId)
    const users = [family.athleteUserId, ...family.parentUserIds].filter((u): u is string => Boolean(u))
    if (!users.length) continue
    const { data: athlete } = await admin.from("athletes").select('"firstName", name').eq("id", athleteId).maybeSingle()
    const wrestlerFirstName = String(athlete?.firstName ?? "").trim() || String(athlete?.name ?? "").trim().split(" ")[0] || "Your wrestler"

    for (const userId of users) {
      if (!emailCache.has(userId)) {
        const { data } = await admin.auth.admin.getUserById(userId)
        emailCache.set(userId, data?.user?.email ?? null)
      }
      const email = emailCache.get(userId)
      if (!email) continue
      if (!tierCache.has(userId)) {
        const { viewer } = await resolveRankingViewerForUser({ admin, userId }).catch(() => ({ viewer: null }))
        tierCache.set(userId, viewer && hasPortalAccess(viewer) ? "portal" : viewer && hasPremiumAccess(viewer) ? "rankings" : "free")
      }
      const tier = tierCache.get(userId)!
      const paid = tier !== "free"
      out.push({
        userId,
        email,
        athleteId,
        wrestlerFirstName,
        tier,
        views: recent.length,
        programCount: programs.length || 1,
        programs: paid ? programs : [],
        firstTime: paid ? firstTime : [],
        unreadMessages: await unreadCount(admin, userId).catch(() => 0),
      })
    }
  }
  return out
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** The email itself. Short: the number, the names when paid, one button. */
export function renderFamilyDigest(d: FamilyDigest): { subject: string; html: string; text: string } {
  const n = d.programCount
  const who = `${n} college program${n === 1 ? "" : "s"}`
  const subject = `${who} viewed ${d.wrestlerFirstName}'s profile this week`
  const cta =
    d.tier === "free"
      ? { label: "See which programs", href: `${SITE}/plans` }
      : d.tier === "rankings"
        ? { label: "See who's viewing", href: `${SITE}/my-recruiting/activity` }
        : { label: "Open your Command Center", href: `${SITE}/my-recruiting/activity` }
  const first = d.firstTime.length ? `<p style="margin:0 0 12px;padding:10px 12px;background:#fef9e7;border-radius:6px;font-size:14px"><b>New:</b> ${esc(d.firstTime.join(", "))} looked for the first time.</p>` : ""
  const names = d.programs.length
    ? `<ul style="margin:0 0 16px;padding-left:18px;font-size:15px">${d.programs.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#374151">The program names are part of every paid plan, from $9.99 a month.</p>`
  const messages = d.unreadMessages
    ? `<p style="margin:0 0 16px;font-size:15px"><b>${d.unreadMessages}</b> coach message${d.unreadMessages === 1 ? "" : "s"} waiting. <a href="${SITE}/inbox" style="color:#003366">Read ${d.unreadMessages === 1 ? "it" : "them"}</a>.</p>`
    : ""
  const unsub = unsubscribeUrl(SITE, d.email)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#111827;max-width:560px;margin:0 auto;padding:20px">
<div style="background:#0B1D3A;padding:22px 24px;border-radius:10px 10px 0 0">
<p style="margin:0;color:#D3B574;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Your week in recruiting</p>
<h1 style="margin:6px 0 0;color:#fff;font-size:24px;line-height:1.2">${esc(who)} viewed ${esc(d.wrestlerFirstName)}&rsquo;s profile</h1>
</div>
<div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:22px 24px">
${first}${names}${messages}
<p style="margin:20px 0"><a href="${cta.href}" style="display:inline-block;background:#D3B574;color:#0A1628;padding:13px 26px;border-radius:8px;font-weight:800;text-decoration:none">${esc(cta.label)}</a></p>
<p style="margin:0;font-size:13px;color:#6b7280">College coaches look at NC wrestler profiles on RecruitNC every day. A complete profile, current results and a highlight reel help them decide to reach out.</p>
</div>
<p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:16px">NC United Wrestling · <a href="${esc(unsub)}" style="color:#9ca3af">Unsubscribe</a></p>
</body></html>`
  const text = [
    `${who} viewed ${d.wrestlerFirstName}'s profile this week.`,
    d.firstTime.length ? `New: ${d.firstTime.join(", ")} looked for the first time.` : "",
    d.programs.length ? d.programs.map((p) => `- ${p}`).join("\n") : "The program names are part of every paid plan, from $9.99 a month.",
    d.unreadMessages ? `${d.unreadMessages} coach message(s) waiting: ${SITE}/inbox` : "",
    `${cta.label}: ${cta.href}`,
    `Unsubscribe: ${unsub}`,
  ]
    .filter(Boolean)
    .join("\n\n")
  return { subject, html, text }
}

/** Send (or, with dryRun, only count) this week's family emails. Suppressed addresses are skipped. */
export async function sendFamilyDigests(admin: SupabaseClient, options: { dryRun: boolean }): Promise<{ families: number; sent: number; skippedUnsubscribed: number; failed: number }> {
  const digests = await buildFamilyDigests(admin)
  const { allowed } = await filterUnsubscribed(admin, [...new Set(digests.map((d) => d.email))])
  const ok = new Set(allowed.map((e) => e.toLowerCase()))
  const toSend = digests.filter((d) => ok.has(d.email.toLowerCase()))
  const skippedUnsubscribed = digests.length - toSend.length
  if (options.dryRun || !process.env.RESEND_API_KEY) return { families: digests.length, sent: 0, skippedUnsubscribed, failed: 0 }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0
  for (const d of toSend) {
    const { subject, html, text } = renderFamilyDigest(d)
    const result = await resend.emails
      .send({ from: "RecruitNC <info@ncwrestlingunited.com>", to: [d.email], subject, html, text, headers: { "List-Unsubscribe": `<${unsubscribeUrl(SITE, d.email)}>` } })
      .catch((e: unknown) => ({ error: { message: e instanceof Error ? e.message : String(e) } }))
    if ((result as { error?: unknown }).error) failed++
    else sent++
    // Resend's default limit is a few requests a second.
    await new Promise((r) => setTimeout(r, 250))
  }
  return { families: digests.length, sent, skippedUnsubscribed, failed }
}
