import { createAdminClient } from "@/lib/supabase/admin"
import { sendReimbursementRequestStatusEmail, type ReimbursementStatusEmailKind } from "@/lib/email/reimbursement-request-status-email"
import { sendSms, toE164 } from "@/lib/sms"

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
