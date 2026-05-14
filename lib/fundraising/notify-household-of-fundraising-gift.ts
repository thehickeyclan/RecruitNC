import type Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import { sendFundraisingGiftHouseholdEmail } from "@/lib/email/fundraising-gift-household-email"
import { getAthleteFundraisingPublicSnapshot } from "@/lib/fundraising/athlete-public-stats"
import { resolveFundraisingAthletePublic } from "@/lib/fundraising/athlete-fundraising-profiles"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { deriveCheckoutAttributionFromStripeSession } from "@/lib/spartan-donation-checkout-attribution"
import { sendSms, toE164 } from "@/lib/sms"

const ATHLETE_PAGE_SURFACE = "athlete_page"

function publicAppOrigin(): string {
  const u = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "")
  if (u) return u
  return "https://app.ncwrestlingunited.com"
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

/** Donor label for household email + thank-you line — respects donor_list_public on session metadata. */
export function householdDonorLabelFromCheckoutSession(session: Stripe.Checkout.Session): string {
  const meta = (session.metadata ?? {}) as Record<string, string>
  const v = meta.donor_list_public
  const publicOk = !(v === "false" || v === "0" || v === "no")
  if (!publicOk) return "Anonymous"
  const name =
    ((session.customer_details?.name as string | undefined) ?? "").trim() ||
    (typeof meta.donor_name === "string" ? meta.donor_name.trim() : "")
  if (name) return name
  return "A supporter"
}

async function tryInsertNotifyLog(admin: SupabaseClient, checkoutSessionId: string): Promise<boolean> {
  const { error } = await admin.from("fundraising_household_gift_notify_log").insert({ checkout_session_id: checkoutSessionId })
  if (!error) return true
  if (error.code === "23505") return false
  if (error.code === "42P01" || /does not exist/i.test(error.message)) {
    console.warn("[fundraising-household-gift] notify log table missing — run scripts/supabase-fundraising-household-notifications.sql")
    return true
  }
  console.warn("[fundraising-household-gift] notify log insert:", error.message)
  return true
}

type ProfileNotifyPrefs = {
  notifyEmailFundraisingGifts: boolean
  notifySmsFundraisingGifts: boolean
}

function prefsFromRow(row: Record<string, unknown>): ProfileNotifyPrefs {
  const ne = row.notify_email_fundraising_gifts
  const ns = row.notify_sms_fundraising_gifts
  return {
    notifyEmailFundraisingGifts: ne !== false,
    notifySmsFundraisingGifts: ns !== false,
  }
}

async function loadLinkedHouseholdUserIds(admin: SupabaseClient, athleteId: string): Promise<string[]> {
  const ids = new Set<string>()
  const { data: links } = await admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athleteId)
  for (const r of links ?? []) {
    const u = (r as { user_id?: string }).user_id
    if (u) ids.add(u)
  }
  const { data: selfRows } = await admin.from("user_profiles").select("user_id").eq("athlete_id", athleteId)
  for (const r of selfRows ?? []) {
    const u = (r as { user_id?: string }).user_id
    if (u) ids.add(u)
  }
  return [...ids]
}

/**
 * After a paid Spartan checkout is persisted: notify linked household for athlete-page gifts only.
 * Best-effort; never throws. Requires notify columns + log table for full behavior (SQL script).
 */
export async function notifyHouseholdOfFundraisingGiftIfEligible(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.metadata?.channel !== "spartan") return
  if (session.payment_status !== "paid") return
  const amountCents = session.amount_total ?? 0
  if (amountCents < 1) return

  const attribution = deriveCheckoutAttributionFromStripeSession(session)
  if (attribution.fundraisingCheckoutSurface !== ATHLETE_PAGE_SURFACE) return
  const slug = attribution.fundraisingAthleteSlug?.trim().toLowerCase()
  if (!slug) return

  const sessionId = session.id
  if (!sessionId.startsWith("cs_")) return

  const shouldSend = await tryInsertNotifyLog(admin, sessionId)
  if (!shouldSend) return

  const entries = await getFundraisingAthleteEntries(admin)
  const resolved = await resolveFundraisingAthletePublic(admin, slug, entries)
  if (!resolved) return
  const aid =
    (typeof resolved.profile?.athlete_id === "string" ? resolved.profile.athlete_id.trim() : "") ||
    (resolved.entry?.id && !resolved.entry.id.startsWith("spartan-fundraising:") ? resolved.entry.id.trim() : "")
  if (!aid) return

  const athleteName =
    resolved.entry?.fullName?.trim() ||
    resolved.entry?.label?.split("·")[0]?.trim() ||
    resolved.fallbackDisplayName?.trim() ||
    "Your athlete"

  const ledgerCodes =
    resolved.ledgerCodes.length > 0 ? resolved.ledgerCodes : resolved.code ? [resolved.code] : []
  const snap = ledgerCodes.length > 0 ? await getAthleteFundraisingPublicSnapshot(ledgerCodes, 1) : null
  const walletTotalDisplay =
    snap?.stats?.raisedCents != null ? formatUsd(snap.stats.raisedCents) : "— (open your wallet for the latest total)"

  const giftPageUrl = `${publicAppOrigin()}/fundraising/athletes/${encodeURIComponent(slug)}`
  const donorLabel = householdDonorLabelFromCheckoutSession(session)
  const amountDisplay = formatUsd(amountCents)

  const userIds = await loadLinkedHouseholdUserIds(admin, aid)
  if (userIds.length === 0) return

  const profileSelect = "user_id, cell_phone, notify_email_fundraising_gifts, notify_sms_fundraising_gifts"
  let profErr: { message: string; code?: string } | null = null
  let profilesPayload = await admin.from("user_profiles").select(profileSelect).in("user_id", userIds)
  let rows = profilesPayload.data
  profErr = profilesPayload.error

  if (profErr && /notify_email_fundraising_gifts|42703|column/i.test(profErr.message)) {
    const fallback = await admin.from("user_profiles").select("user_id, cell_phone").in("user_id", userIds)
    rows = fallback.data
    profErr = fallback.error
  } else if (profErr) {
    console.warn("[fundraising-household-gift] user_profiles:", profErr.message)
  }

  const rowByUser = new Map<string, Record<string, unknown>>()
  for (const r of rows ?? []) {
    const uid = (r as { user_id?: string }).user_id
    if (uid) rowByUser.set(uid, r as Record<string, unknown>)
  }

  for (const uid of userIds) {
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(uid)
    if (authErr || !authData?.user?.email) continue
    const email = authData.user.email.trim()
    if (!email) continue

    const prow = rowByUser.get(uid) ?? {}
    const prefs =
      "notify_email_fundraising_gifts" in prow || "notify_sms_fundraising_gifts" in prow
        ? prefsFromRow(prow)
        : { notifyEmailFundraisingGifts: true, notifySmsFundraisingGifts: true }

    if (prefs.notifyEmailFundraisingGifts) {
      const send = await sendFundraisingGiftHouseholdEmail({
        to: email,
        athleteName,
        donorLabel,
        amountDisplay,
        walletTotalDisplay,
        giftPageUrl,
      })
      if (!send.success) {
        console.warn("[fundraising-household-gift] email failed", uid, send.error)
      }
    }

    if (prefs.notifySmsFundraisingGifts) {
      const phone = (prow.cell_phone as string | null | undefined) ?? null
      const e164 = toE164(phone)
      if (e164) {
        const thank =
          donorLabel === "Anonymous" || donorLabel === "A supporter"
            ? "Thank your supporter personally."
            : `Thank ${donorLabel} personally.`
        const body = `NC United: ${donorLabel} gave ${amountDisplay} to ${athleteName}. Total ~ ${walletTotalDisplay}. ${thank} ${giftPageUrl}`
        const ok = await sendSms(e164, body.slice(0, 320))
        if (!ok) console.warn("[fundraising-household-gift] SMS not sent for", uid)
      }
    }
  }
}
