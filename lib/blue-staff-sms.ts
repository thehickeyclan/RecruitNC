/**
 * Staff SMS when a new NC United Blue subscription is created (first payment).
 *
 * Env: RECRUITNC_BLUE_NEW_SUB_SMS_TO — comma-separated US numbers.
 * Optional: BLUE_DISABLE_STAFF_SMS=1 to disable.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendSms, toE164 } from "@/lib/sms"

const STAFF_SMS_ENV = "RECRUITNC_BLUE_NEW_SUB_SMS_TO"

function staffSmsEnabled(): boolean {
  const v = process.env.BLUE_DISABLE_STAFF_SMS
  if (!v) return true
  return v !== "1" && v.toLowerCase() !== "true" && v.toLowerCase() !== "yes"
}

function staffAlertE164Recipients(): string[] {
  const raw =
    process.env[STAFF_SMS_ENV]?.trim() ||
    process.env.RECRUITNC_STORE_NEW_ORDER_SMS_TO?.trim() ||
    process.env.RECRUITNC_REIMBURSEMENT_NEW_REQUEST_SMS_TO?.trim()
  if (!raw) return []
  const out: string[] = []
  for (const part of raw.split(",")) {
    const e = toE164(part.trim())
    if (e) out.push(e)
  }
  return out
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export type BlueNewSubStaffSmsParams = {
  signupId: string
  athleteName: string
  parentEmail: string
  amountDollars: number
}

/** Idempotent staff SMS for new Blue subscriptions. Does not throw. */
export async function notifyStaffBlueNewSubscription(
  admin: SupabaseClient,
  params: BlueNewSubStaffSmsParams,
): Promise<{ sent: number; skipped: boolean }> {
  if (!staffSmsEnabled()) return { sent: 0, skipped: true }

  const recipients = staffAlertE164Recipients()
  if (recipients.length === 0) return { sent: 0, skipped: true }

  const { data: existing } = await admin
    .from("blue_staff_sms")
    .select("signup_id")
    .eq("signup_id", params.signupId)
    .maybeSingle()

  if (existing) return { sent: 0, skipped: true }

  const athlete = (params.athleteName || "New member").trim()
  const email = (params.parentEmail || "").trim()
  const amount = formatMoney(params.amountDollars > 0 ? params.amountDollars : 55)
  const body = `RecruitNC Blue: New member ${athlete}${email ? ` (${email})` : ""}. ${amount}/mo. Admin: /admin/blue/subscriptions`

  let sent = 0
  for (const e164 of recipients) {
    const ok = await sendSms(e164, body)
    if (ok) sent++
  }

  if (sent > 0) {
    const { error: logErr } = await admin.from("blue_staff_sms").insert({ signup_id: params.signupId })
    if (logErr && (logErr as { code?: string }).code !== "42P01") {
      console.warn("[RecruitNC] blue staff SMS: log failed", params.signupId, logErr.message)
    }
  }

  return { sent, skipped: false }
}
