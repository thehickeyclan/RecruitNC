import type { SupabaseClient } from "@supabase/supabase-js"
import { sendFundraisingActivationApprovedEmail } from "@/lib/email/fundraising-activation-approved-email"
import { sendSms, toE164 } from "@/lib/sms"

function publicAppOrigin(): string {
  const u = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "")
  if (u) return u
  return "https://app.ncwrestlingunited.com"
}

/**
 * Email (always when we have an address) + optional SMS when `notify_sms_fundraising_activation` is true.
 * Does not throw — logs warnings only.
 */
export async function sendFundraisingActivationApprovedNotifications(
  admin: SupabaseClient,
  params: {
    parentUserId: string
    requesterEmail: string | null
    athleteId: string
    fundraisingSlug: string
  },
): Promise<void> {
  const slug = params.fundraisingSlug.trim().toLowerCase()
  const parentUserId = params.parentUserId.trim()
  if (!slug || !parentUserId) return

  const { data: ath } = await admin.from("athletes").select("name").eq("id", params.athleteId).maybeSingle()
  const athleteName = typeof ath?.name === "string" && ath.name.trim() ? ath.name.trim() : "Your athlete"

  let toEmail = (params.requesterEmail ?? "").trim().toLowerCase()
  if (!toEmail) {
    const { data: auth } = await admin.auth.admin.getUserById(parentUserId)
    const em = auth.user?.email
    toEmail = typeof em === "string" ? em.trim().toLowerCase() : ""
  }

  const pageUrl = `${publicAppOrigin()}/fundraising/athletes/${encodeURIComponent(slug)}`

  if (toEmail) {
    const r = await sendFundraisingActivationApprovedEmail({ to: toEmail, athleteName, pageUrl })
    if (!r.success) {
      console.warn("[fundraising-activation-approved] email failed:", r.error)
    }
  } else {
    console.warn("[fundraising-activation-approved] no email for user", parentUserId)
  }

  type ProfRow = { cell_phone?: string | null; notify_sms_fundraising_activation?: boolean }
  let profPayload = await admin
    .from("user_profiles")
    .select("cell_phone, notify_sms_fundraising_activation")
    .eq("user_id", parentUserId)
    .maybeSingle()

  let prof = profPayload.data as ProfRow | null
  if (
    profPayload.error &&
    /notify_sms_fundraising_activation|42703|column/i.test(profPayload.error.message)
  ) {
    const fb = await admin.from("user_profiles").select("cell_phone").eq("user_id", parentUserId).maybeSingle()
    prof = fb.data as ProfRow | null
  } else if (profPayload.error) {
    console.warn("[fundraising-activation-approved] profile:", profPayload.error.message)
    return
  }

  if (prof?.notify_sms_fundraising_activation === true) {
    const e164 = toE164(prof.cell_phone ?? null)
    if (e164) {
      const first = athleteName.split(/\s+/)[0] || athleteName
      const body = `NC United: ${first}'s fundraising page is live. Share: ${pageUrl}`
      const ok = await sendSms(e164, body.slice(0, 320))
      if (!ok) console.warn("[fundraising-activation-approved] SMS not sent for", parentUserId)
    }
  }
}
