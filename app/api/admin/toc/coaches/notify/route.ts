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
import { applyKnownIdentities, phoneKeyFor, toCheckInList, type KnownPerson } from "@/lib/toc/coach-designation"

/**
 * Tells a credentialed coach they are in, by whichever means we have.
 *
 * Email when we hold one, text otherwise — a coach given by mobile alone is still a coach, and
 * refusing to contact him because there is no address would lose him at the door.
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
    | { coachKey?: unknown; force?: unknown }
    | null
  const only = typeof body?.coachKey === "string" ? body.coachKey.trim() : null
  const force = body?.force === true

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("toc_coach_designations")
    .select("coach_key,coach_name,coach_email,coach_phone,status,athlete_name,weight_class,notified_at")

  if (error) {
    console.error("[toc coach notify] load:", error.message)
    return NextResponse.json({ error: "Could not load coaches." }, { status: 500 })
  }

  const rows = data ?? []

  // Same resolution the list uses, so a coach who arrived under two keys is messaged once.
  const emails = [...new Set(rows.map((r) => String(r.coach_email ?? "").trim().toLowerCase()).filter(Boolean))]
  const phones = [...new Set(rows.map((r) => phoneKeyFor(String(r.coach_phone ?? ""))).filter(Boolean))] as string[]
  const identities = new Map<string, KnownPerson>()
  if (emails.length || phones.length) {
    const [byEmail, byPhone] = await Promise.all([
      emails.length ? admin.from("user_profiles").select("user_id,full_name,email,cell_phone").in("email", emails) : Promise.resolve({ data: [] as never[] }),
      phones.length ? admin.from("user_profiles").select("user_id,full_name,email,cell_phone").in("cell_phone", phones) : Promise.resolve({ data: [] as never[] }),
    ])
    for (const p of [...(byEmail.data ?? []), ...(byPhone.data ?? [])]) {
      const known: KnownPerson = { key: `user:${p.user_id}`, name: p.full_name ?? null, email: p.email ?? null, phone: p.cell_phone ?? null }
      const e = String(p.email ?? "").trim().toLowerCase()
      if (e) identities.set(e, known)
      const ph = phoneKeyFor(String(p.cell_phone ?? ""))
      if (ph) identities.set(`tel:${ph}`, known)
    }
  }

  const resolved = applyKnownIdentities(rows, identities)

  // One person's designations may sit under several keys — their email, their mobile, their id.
  // Remember which originals fed each resolved coach so the stamp can find all of them.
  const originalKeys = new Map<string, Set<string>>()
  rows.forEach((row, i) => {
    const canonical = resolved[i].coach_key
    const set = originalKeys.get(canonical) ?? new Set<string>()
    set.add(row.coach_key)
    originalKeys.set(canonical, set)
  })
  const notifiedKeys = new Set(
    resolved.filter((r) => (r as { notified_at?: string | null }).notified_at).map((r) => r.coach_key),
  )

  // Only approved coaches, and only those not already told — the point of the stamp.
  const coaches = toCheckInList(resolved).filter((c) => {
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
    let channel = "none"
    let ok = false

    if (coach.coachEmail) {
      channel = "email"
      ok = await sendEmail(coach.coachEmail, coachInviteSubject(), coachInviteHtml(payload), coachInviteText(payload))
    } else {
      const e164 = toE164(coach.coachPhone)
      if (e164) {
        channel = "sms"
        ok = await sendSms(e164, coachInviteSms(payload))
      }
    }

    if (ok) {
      // Stamp every row for the person, not just the one that happened to carry the address.
      const keys = [...(originalKeys.get(coach.coachKey) ?? new Set([coach.coachKey]))]
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
