import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * One way to claim a wrestler's profile, for the website and the app.
 *
 * There were three: the website's, the app's, and a legacy endpoint that asked for no
 * relationship at all. All of them wrote a claim instantly, recorded nothing beyond a user id and
 * a timestamp, and told nobody. Cole Shuster tapped once and took ownership of Austin Laws - a
 * different family's son - and the only reason anyone found out is that his mother happened to
 * notice and write in.
 *
 * So: one path, one record. The relationship is stated rather than assumed, a claim on a minor's
 * profile is signed, and every claim leaves a row saying who, what, on what basis and from where.
 * Claims that look wrong are flagged for review rather than refused, because a surname is a hint
 * and not a fact - families do not all share one.
 */

export const CLAIM_CONSENT_VERSION = "2026-10-01"

export const CLAIM_CONSENT_TEXT: Record<"self" | "parent", string> = {
  self: "I confirm this profile is mine. I understand my results, school, weight class and graduation year are shown publicly, and that I can ask for it to be removed at any time.",
  parent:
    "I confirm I am the parent or legal guardian of this athlete. I consent, on my child's behalf, to RecruitNC showing their wrestling results, school, weight class and graduation year on a public profile, and to managing that profile for them. I understand I can request removal at any time. Typing my name is my electronic signature.",
}

export type ClaimRelationship = "self" | "parent"

export type ClaimInput = {
  userId: string
  athleteId: string
  relationship: ClaimRelationship
  /** Typed name, the signature. Required for a parent claiming a minor. */
  signedName?: string | null
  viewerName?: string | null
  ip?: string | null
  userAgent?: string | null
}

export type ClaimResult =
  | { ok: true; athleteName: string; needsReview: boolean; reviewReason: string | null }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string }

/** A surname in common is weak evidence, but the absence of one is worth a look. */
function surname(full: string): string {
  const parts = String(full ?? "").trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : ""
}

/**
 * Record a claim that has just happened, and say whether it looks odd.
 *
 * Separate from making the claim because both surfaces already have their own working claim
 * code, with audit entries and notifications wired through it; what neither had was the record.
 */
export async function recordClaimConsent(
  admin: SupabaseClient,
  input: ClaimInput & { athleteName?: string | null },
): Promise<{ needsReview: boolean; reviewReason: string | null }> {
  const reasons: string[] = []
  const name = String(input.athleteName ?? "")
  if (input.viewerName && surname(input.viewerName) && surname(name)) {
    if (surname(input.viewerName) !== surname(name)) reasons.push("different surname")
  }
  const { count } = await admin
    .from("athletes")
    .select("id", { count: "exact", head: true })
    .eq("claimed_by_user_id", input.userId)
  if ((count ?? 0) >= 3) reasons.push(`account already claims ${count}`)

  const { error } = await admin.from("profile_claim_consents").insert({
    athlete_id: input.athleteId,
    user_id: input.userId,
    relationship: input.relationship,
    signed_name: String(input.signedName ?? "").trim() || null,
    consent_version: CLAIM_CONSENT_VERSION,
    consent_text: CLAIM_CONSENT_TEXT[input.relationship],
    ip_address: input.ip ?? null,
    user_agent: input.userAgent ?? null,
    needs_review: reasons.length > 0,
    review_reason: reasons.join("; ") || null,
  })
  if (error) console.error("[profile-claim] consent row failed:", error.message)
  return { needsReview: reasons.length > 0, reviewReason: reasons.join("; ") || null }
}

export async function claimProfile(admin: SupabaseClient, input: ClaimInput): Promise<ClaimResult> {
  const { data: athlete } = await admin
    .from("athletes")
    .select("id, name, graduationyear, claimed_by_user_id")
    .eq("id", input.athleteId)
    .maybeSingle()

  if (!athlete) return { ok: false, status: 404, error: "That profile no longer exists." }

  const athleteName = String((athlete as { name?: string }).name ?? "this athlete")
  const claimedBy = String((athlete as { claimed_by_user_id?: string | null }).claimed_by_user_id ?? "")

  if (input.relationship === "self") {
    if (claimedBy && claimedBy !== input.userId) {
      return {
        ok: false,
        status: 409,
        error: `${athleteName} has already been claimed by another account. If that is wrong, contact us and we will sort it out.`,
      }
    }
  }

  if (input.relationship === "parent" && !String(input.signedName ?? "").trim()) {
    return { ok: false, status: 400, error: "Type your full name to sign as parent or guardian." }
  }

  /*
   * Flagged, not blocked. A claim that looks odd still goes through - families have different
   * surnames, and a parent stuck at a wall at 10pm just stops using the site - but it lands in
   * a queue where somebody can look at it.
   */
  const reasons: string[] = []
  if (input.viewerName && surname(input.viewerName) && surname(athleteName)) {
    if (surname(input.viewerName) !== surname(athleteName)) reasons.push("different surname")
  }
  const { count: alreadyClaimed } = await admin
    .from("athletes")
    .select("id", { count: "exact", head: true })
    .eq("claimed_by_user_id", input.userId)
  if ((alreadyClaimed ?? 0) >= 3) reasons.push(`account already claims ${alreadyClaimed}`)

  if (input.relationship === "self") {
    const { error } = await admin
      .from("athletes")
      .update({ claimed_by_user_id: input.userId, claimed_at: new Date().toISOString() })
      .eq("id", input.athleteId)
    if (error) return { ok: false, status: 403, error: error.message }
    await admin.from("user_profiles").update({ athlete_id: input.athleteId }).eq("user_id", input.userId)
  } else {
    const { error } = await admin
      .from("parent_athlete_links")
      .upsert({ user_id: input.userId, athlete_id: input.athleteId }, { onConflict: "user_id,athlete_id" })
    if (error && (error as { code?: string }).code !== "23505") {
      return { ok: false, status: 403, error: error.message }
    }
  }

  /* The record is the point: who claimed what, on what basis, agreeing to which words, from where. */
  const { error: consentError } = await admin.from("profile_claim_consents").insert({
    athlete_id: input.athleteId,
    user_id: input.userId,
    relationship: input.relationship,
    signed_name: String(input.signedName ?? "").trim() || null,
    consent_version: CLAIM_CONSENT_VERSION,
    consent_text: CLAIM_CONSENT_TEXT[input.relationship],
    ip_address: input.ip ?? null,
    user_agent: input.userAgent ?? null,
    needs_review: reasons.length > 0,
    review_reason: reasons.join("; ") || null,
  })
  if (consentError) console.error("[profile-claim] consent row failed:", consentError.message)

  return { ok: true, athleteName, needsReview: reasons.length > 0, reviewReason: reasons.join("; ") || null }
}
