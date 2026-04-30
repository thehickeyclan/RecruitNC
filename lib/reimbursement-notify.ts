import { createAdminClient } from "@/lib/supabase/admin"
import { displayExpenseType } from "@/lib/athlete-expense-requests"
import { sendReimbursementRequestStatusEmail, type ReimbursementStatusEmailKind } from "@/lib/email/reimbursement-request-status-email"
import { sendSms, toE164 } from "@/lib/sms"

/**
 * Comma-separated US numbers or E.164 (e.g. `6316625409,+15551234567`).
 * When unset, no staff SMS is sent for new requests.
 */
const NEW_REQUEST_STAFF_SMS_ENV = "RECRUITNC_REIMBURSEMENT_NEW_REQUEST_SMS_TO"

const BASE = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com").replace(
  /\/$/,
  "",
)

function displayNameFromProfile(p: {
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
}): string {
  const n = p.full_name?.trim() || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
  if (n) return n
  return p.email?.split("@")[0] || "there"
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function staffAlertE164Recipients(): string[] {
  const raw = process.env[NEW_REQUEST_STAFF_SMS_ENV]?.trim()
  if (!raw) return []
  const out: string[] = []
  for (const part of raw.split(",")) {
    const e = toE164(part.trim())
    if (e) out.push(e)
  }
  return out
}

/**
 * Text staff when a parent submits a new reimbursement request (Profile → Fundraise).
 * Uses Twilio (`lib/sms.ts`); does not throw.
 */
export function notifyStaffNewReimbursementRequestDegraded(params: {
  requestId: string
  submitterUserId: string
  /** Auth email — used when user_profiles row is missing or slow to sync */
  submitterEmail?: string | null
  athleteId: string
  expenseTypeValue: string
  amountCents: number
}): void {
  void (async () => {
    const recipients = staffAlertE164Recipients()
    if (recipients.length === 0) {
      return
    }

    const { requestId, submitterUserId, submitterEmail, athleteId, expenseTypeValue, amountCents } = params
    const admin = createAdminClient()
    const [{ data: profile, error: pe }, { data: ath, error: ae }] = await Promise.all([
      admin
        .from("user_profiles")
        .select("email, first_name, last_name, full_name")
        .eq("user_id", submitterUserId)
        .maybeSingle(),
      admin.from("athletes").select("name").eq("id", athleteId).maybeSingle(),
    ])
    if (pe) {
      console.error("[RecruitNC] reimbursement staff SMS: profile", pe.message)
      return
    }
    if (ae) {
      console.error("[RecruitNC] reimbursement staff SMS: athlete", ae.message)
      return
    }

    const prof = profile as {
      email?: string | null
      full_name?: string | null
      first_name?: string | null
      last_name?: string | null
    } | null
    let parentLabel =
      submitterEmail?.trim() || prof?.email?.trim() || ""
    if (!parentLabel && prof) {
      parentLabel = displayNameFromProfile({
        full_name: prof.full_name ?? null,
        first_name: prof.first_name ?? null,
        last_name: prof.last_name ?? null,
        email: prof.email ?? null,
      })
    }
    if (!parentLabel) parentLabel = `${submitterUserId.slice(0, 8)}…`

    const athleteName = (ath as { name?: string | null } | null)?.name?.trim() || "Athlete"
    const cat = displayExpenseType(expenseTypeValue)
    const adminUrl = `${BASE}/admin/expense-requests`
    const body = `RecruitNC: New reimbursement ${formatMoney(amountCents)} — ${athleteName} (${cat}). Parent: ${parentLabel}. Open: ${adminUrl}`

    let sent = 0
    for (const e164 of recipients) {
      const ok = await sendSms(e164, body)
      if (ok) sent++
    }
    if (sent > 0) {
      console.log("[RecruitNC] reimbursement staff SMS: new request", requestId.slice(0, 8), "sent", sent)
    } else {
      console.warn("[RecruitNC] reimbursement staff SMS: new request not sent (Twilio or invalid numbers)")
    }
  })().catch((e) => {
    console.error("[RecruitNC] reimbursement staff SMS: unhandled", e)
  })
}

/**
 * When admin changes status to approved / rejected / paid, email the parent and text their cell (if on file).
 * Does not throw (logs errors). Fire-and-forget from the API route.
 */
export function notifyReimbursementStatusChangeDegraded(params: {
  previousStatus: string
  newStatus: string
  userId: string
  athleteId: string
  amountCents: number
  amountApprovedCents: number | null
  adminNotes: string | null
}): void {
  void (async () => {
    const { previousStatus, newStatus, userId, athleteId, amountCents, amountApprovedCents, adminNotes } = params
    if (previousStatus === newStatus) return
    if (newStatus !== "approved" && newStatus !== "rejected" && newStatus !== "paid") return

    const kind: ReimbursementStatusEmailKind =
      newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : "paid"

    const admin = createAdminClient()
    const [{ data: profile, error: pe }, { data: ath, error: ae }] = await Promise.all([
      admin.from("user_profiles").select("email, first_name, last_name, full_name, cell_phone").eq("user_id", userId).single(),
      admin.from("athletes").select("name").eq("id", athleteId).single(),
    ])
    if (pe || !profile) {
      console.error("[RecruitNC] reimbursement notify: profile", pe?.message)
      return
    }
    if (ae || !ath) {
      console.error("[RecruitNC] reimbursement notify: athlete", ae?.message)
      return
    }

    const email = (profile as { email?: string | null }).email?.trim()
    const parentDisplayName = displayNameFromProfile(
      profile as { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null },
    )
    const athleteName = (ath as { name: string }).name || "Your athlete"
    const lineCents = kind === "rejected" ? amountCents : (amountApprovedCents ?? amountCents)

    if (email) {
      const r = await sendReimbursementRequestStatusEmail({
        to: email,
        parentDisplayName,
        athleteName,
        kind,
        amountCents: lineCents,
        adminNotes: adminNotes?.trim() || null,
      })
      if (!r.success) {
        console.error("[RecruitNC] reimbursement notify email failed", r.error)
      } else {
        console.log("[RecruitNC] reimbursement notify: email sent to", email.slice(0, 3) + "…")
      }
    } else {
      console.warn("[RecruitNC] reimbursement notify: no email on user_profiles for", userId)
    }

    const cell = (profile as { cell_phone?: string | null }).cell_phone
    const e164 = toE164(cell ?? null)
    if (e164) {
      const short = kind === "approved" 
        ? `APPROVED ${formatMoney(lineCents)} for ${athleteName}` 
        : kind === "rejected"
          ? `Not approved (see email) for ${athleteName}`
          : `Marked PAID ${formatMoney(lineCents)} for ${athleteName}`
      const body = `RecruitNC: Reimbursement ${short}. Profile → Fundraise: ${BASE}/profile`
      const ok = await sendSms(e164, body)
      if (!ok) {
        console.warn("[RecruitNC] reimbursement notify: SMS not sent (Twilio or error)")
      } else {
        console.log("[RecruitNC] reimbursement notify: SMS sent")
      }
    } else {
      console.log("[RecruitNC] reimbursement notify: no SMS (missing or invalid cell on profile)")
    }
  })().catch((e) => {
    console.error("[RecruitNC] reimbursement notify: unhandled", e)
  })
}
