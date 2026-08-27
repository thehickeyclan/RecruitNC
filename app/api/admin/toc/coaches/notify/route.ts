import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { sendSms, toE164 } from "@/lib/sms"
import {
  coachInviteHtml,
  coachInviteSms,
  coachInviteSubject,
  coachInviteText,
} from "@/lib/toc/coach-invite-message"
import { toCheckInList } from "@/lib/toc/coach-designation"
import { loadResolvedCoachRows } from "@/lib/toc/coach-identity"

/**
 * Tells a credentialed coach they are in, by whichever means we have.
 *
 * The channel is a choice, not a rule. Left to itself it sends a text, because a coach reads
 * one — an email from an unfamiliar sender about a tournament sits unopened. Where only one
 * detail is on file, that is what is used: a coach given by mobile alone is still a coach.
 *
 * Sending stamps every row for that person, so a second click cannot message him twice. Re-sending
 * on purpose is possible with `force`.
 */

export const dynamic = "force-dynamic"

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[toc coach notify] RESEND_API_KEY not configured")
    return false
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({ from: FROM, to, subject, html, text })
    if (result.error) {
      console.error("[toc coach notify] resend:", result.error)
      return false
    }
    return true
  } catch (e) {
    console.error("[toc coach notify] resend threw:", e)
    return false
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as
    | { coachKey?: unknown; force?: unknown; channel?: unknown }
    | null
  const only = typeof body?.coachKey === "string" ? body.coachKey.trim() : null
  const force = body?.force === true
  // "auto" prefers a text: a coach reads one. An email from a sender they do not recognise,
  // about a tournament they have not entered, is the kind of thing that sits unopened.
  const wanted = body?.channel === "email" || body?.channel === "sms" ? body.channel : "auto"

  const admin = createAdminClient()
  const loaded = await loadResolvedCoachRows(admin)
  if (!loaded.ok) {
    console.error("[toc coach notify] load:", loaded.error)
    return NextResponse.json({ error: "Could not load coaches." }, { status: 500 })
  }
  const { resolved, originalKeys } = loaded.value

  const notifiedKeys = new Set(
    resolved.filter((r) => (r as { notified_at?: string | null }).notified_at).map((r) => String(r.coach_key)),
  )

  // Only approved coaches, and only those not already told — the point of the stamp.
  const coaches = toCheckInList(resolved as never).filter((c) => {
    if (c.status !== "approved") return false
    if (only && c.coachKey !== only) return false
    if (!force && notifiedKeys.has(c.coachKey)) return false
    return true
  })

  const results: { coach: string; channel: string; ok: boolean }[] = []
  const now = new Date().toISOString()

  for (const coach of coaches) {
    const athleteNames = coach.athletes.map((a) => a.athleteName)
    const payload = { coachName: coach.coachName, athleteNames }
    const e164 = toE164(coach.coachPhone)
    const canText = Boolean(e164)
    const canEmail = Boolean(coach.coachEmail)

    // Honour the choice when it is possible; otherwise use whatever we can reach them by.
    let channel: "email" | "sms" | "none" = "none"
    if (wanted === "email" && canEmail) channel = "email"
    else if (wanted === "sms" && canText) channel = "sms"
    else if (wanted === "auto") channel = canText ? "sms" : canEmail ? "email" : "none"
    else channel = canText ? "sms" : canEmail ? "email" : "none"

    let ok = false
    if (channel === "email" && coach.coachEmail) {
      ok = await sendEmail(coach.coachEmail, coachInviteSubject(), coachInviteHtml(payload), coachInviteText(payload))
    } else if (channel === "sms" && e164) {
      ok = await sendSms(e164, coachInviteSms(payload))
    }

    if (ok) {
      // Stamp every row for the person, not just the one that happened to carry the address.
      const keys = originalKeys.get(coach.coachKey) ?? [coach.coachKey]
      const { error: stampError } = await admin
        .from("toc_coach_designations")
        .update({ notified_at: now, notified_channel: channel, updated_at: now })
        .in("coach_key", keys)
      if (stampError) console.error("[toc coach notify] stamp:", stampError.message)
    }
    results.push({ coach: coach.coachName, channel, ok })
  }

  return NextResponse.json({
    attempted: results.length,
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok),
    results,
  })
}
