/**
 * Post-payment side effects: welcome email, staff SMS, invite, parent link, waiver.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendBlueWelcomeEmail } from "@/lib/email"
import { notifyStaffBlueNewSubscription } from "@/lib/blue-staff-sms"
import { ensureParentAthleteLinkAdmin } from "@/lib/fundraising/ensure-parent-athlete-link-admin"
import {
  NC_UNITED_LIABILITY_WAIVER_TYPE,
  NC_UNITED_LIABILITY_WAIVER_VERSION,
} from "@/lib/nc-united-liability-waiver"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

export type BlueSignupNotifyParams = {
  signupId: string
  payerUserId: string | null
  athleteId: string | null
  parentEmail: string
  parentFirstName: string
  parentLastName: string
  athleteName: string
  amountDollars: number
  inviteId: string | null
  /** False when webhook replayed on already-paid signup */
  isFirstPayment: boolean
}

async function passwordSetupUrlForEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: { redirectTo: `${SITE_URL}/auth/reset-password?next=/profile` },
    })
    if (error || !data?.properties?.action_link) return null
    return data.properties.action_link
  } catch {
    return null
  }
}

async function markInviteUsed(admin: SupabaseClient, inviteId: string | null): Promise<void> {
  if (!inviteId) return
  await admin
    .from("blue_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("used_at", null)
}

async function recordWaiver(
  admin: SupabaseClient,
  payerUserId: string,
  athleteId: string,
  signerName: string,
): Promise<void> {
  const { error } = await admin.from("liability_waivers").upsert(
    {
      user_id: payerUserId,
      athlete_id: athleteId,
      waiver_type: NC_UNITED_LIABILITY_WAIVER_TYPE,
      waiver_version: NC_UNITED_LIABILITY_WAIVER_VERSION,
      signer_name: signerName || null,
      signed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,athlete_id,waiver_type" },
  )
  if (error) {
    console.warn("[blue-post-signup-notify] liability_waivers:", error.message)
  }
}

/** Welcome email, staff SMS, invite used, parent link, waiver — idempotent where possible. */
export async function runBlueSignupPostPaymentSideEffects(
  admin: SupabaseClient,
  params: BlueSignupNotifyParams,
): Promise<void> {
  const parentName = [params.parentFirstName, params.parentLastName].filter(Boolean).join(" ").trim()

  if (params.payerUserId && params.athleteId) {
    await ensureParentAthleteLinkAdmin(admin, {
      parentUserId: params.payerUserId,
      athleteId: params.athleteId,
    })
    await recordWaiver(admin, params.payerUserId, params.athleteId, parentName || params.parentEmail)
  }

  await markInviteUsed(admin, params.inviteId)

  if (!params.isFirstPayment) return

  const email = params.parentEmail.trim().toLowerCase()
  if (email) {
    const passwordSetupUrl = await passwordSetupUrlForEmail(admin, email)
    void sendBlueWelcomeEmail({
      to: email,
      parentName: parentName || email.split("@")[0] || "there",
      athleteName: params.athleteName,
      passwordSetupUrl,
    }).then((r) => {
      if (!r.success) console.warn("[blue-post-signup-notify] welcome email:", r.error)
    })
  }

  void notifyStaffBlueNewSubscription(admin, {
    signupId: params.signupId,
    athleteName: params.athleteName,
    parentEmail: params.parentEmail,
    amountDollars: params.amountDollars,
  }).then((r) => {
    if (r.sent > 0) console.log("[RecruitNC] blue staff SMS: sent for signup", params.signupId.slice(0, 8))
  })
}
