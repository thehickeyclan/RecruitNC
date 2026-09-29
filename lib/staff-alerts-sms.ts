/**
 * Staff SMS for the three things worth interrupting somebody over.
 *
 * A Blue interest submission, a new rankings subscription, and a cancellation. Each is rare,
 * each wants a human response, and each was previously only discoverable by opening an admin
 * page and noticing a new row.
 *
 * Recipients and the disable switch follow `blue-staff-sms.ts` so there is one thing to
 * configure, not four. Nothing here throws: a failed text must never fail the signup, the
 * payment, or the webhook Stripe is waiting on.
 */
import { sendSms, toE164 } from "@/lib/sms"

/** Falls back through the numbers already configured for other staff alerts. */
function recipients(): string[] {
  const raw =
    process.env.RECRUITNC_STAFF_ALERT_SMS_TO?.trim() ||
    process.env.RECRUITNC_BLUE_NEW_SUB_SMS_TO?.trim() ||
    process.env.RECRUITNC_STORE_NEW_ORDER_SMS_TO?.trim()
  if (!raw) return []
  const out: string[] = []
  for (const part of raw.split(",")) {
    const e = toE164(part.trim())
    if (e) out.push(e)
  }
  return out
}

function enabled(): boolean {
  const v = process.env.BLUE_DISABLE_STAFF_SMS
  if (!v) return true
  return v !== "1" && v.toLowerCase() !== "true" && v.toLowerCase() !== "yes"
}

async function send(body: string, label: string): Promise<number> {
  if (!enabled()) return 0
  const to = recipients()
  if (!to.length) {
    console.warn(`[staff-sms] ${label}: no recipients configured`)
    return 0
  }
  let sent = 0
  for (const e164 of to) {
    try {
      if (await sendSms(e164, body)) sent++
    } catch (e) {
      console.error(`[staff-sms] ${label}`, e instanceof Error ? e.message : e)
    }
  }
  console.info(`[staff-sms] ${label}: sent ${sent}/${to.length}`)
  return sent
}

function money(cents: number | null | undefined): string {
  const c = Number(cents ?? 0)
  return `$${(c / 100).toFixed(2)}`
}

/** Somebody asked to be considered for Blue. */
export async function notifyStaffBlueInterest(input: {
  athleteName?: string | null
  graduationYear?: string | number | null
  highSchool?: string | null
  parentEmail?: string | null
}): Promise<number> {
  const who = String(input.athleteName ?? "").trim() || "Someone"
  const cls = input.graduationYear ? ` '${String(input.graduationYear).slice(-2)}` : ""
  const hs = String(input.highSchool ?? "").trim()
  const email = String(input.parentEmail ?? "").trim()
  return send(
    `Blue interest: ${who}${cls}${hs ? ` — ${hs}` : ""}${email ? ` (${email})` : ""}. Admin: /admin/blue-interest`,
    "blue-interest",
  )
}

/** A rankings subscription started. */
export async function notifyStaffSubscriptionStarted(input: {
  email?: string | null
  amountCents?: number | null
  interval?: string | null
}): Promise<number> {
  const who = String(input.email ?? "").trim() || "A subscriber"
  const price = input.amountCents ? ` ${money(input.amountCents)}` : ""
  const every = input.interval ? `/${input.interval}` : ""
  return send(`RecruitNC: new subscription — ${who}${price}${every}.`, "subscription-started")
}

/**
 * A rankings subscription ended.
 *
 * Worth a text for the opposite reason to a signup: a cancellation is the only one of the
 * three nobody would otherwise find out about, and it is the one where a phone call still
 * changes the outcome.
 */
export async function notifyStaffSubscriptionCancelled(input: {
  email?: string | null
  status?: string | null
}): Promise<number> {
  const who = String(input.email ?? "").trim() || "A subscriber"
  const why = String(input.status ?? "").trim()
  return send(`RecruitNC: subscription cancelled — ${who}${why ? ` (${why})` : ""}.`, "subscription-cancelled")
}

/**
 * A college coach signed up and was let straight in.
 *
 * Coach access is granted first and reviewed after, so this text is the review prompt: until
 * someone confirms or rejects them on the users dashboard, an unchecked account can see athlete
 * contact details.
 */
export async function notifyStaffCoachSignup(input: {
  name: string
  college: string
  email: string
}): Promise<number> {
  return send(
    `College coach signed up (has access): ${input.name} — ${input.college} (${input.email}). Review: /admin/users-dashboard`,
    "coach-signup",
  )
}
