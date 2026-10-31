/**
 * Which brand a person belongs to, for anything sent outside a page view (emails, digests, alerts).
 *
 * Accounts record the site they signed up on (user_metadata.signup_brand, from 27 Oct 2026). Older
 * accounts have none: a family whose wrestler is outside North Carolina is RecruitWrestlers' (NC
 * United only shows North Carolina); everyone else stays NC United's until they sign in on
 * recruitwrestlers.com.
 */
export type UserBrand = "recruitwrestlers" | "ncunited"

export function userBrand(meta: Record<string, unknown> | null | undefined, wrestlerState?: string | null): UserBrand {
  const recorded = String(meta?.signup_brand ?? "")
  if (recorded === "recruitwrestlers" || recorded === "ncunited") return recorded
  if (wrestlerState && wrestlerState.toUpperCase() !== "NC") return "recruitwrestlers"
  return "ncunited"
}

export const BRAND_SITE: Record<UserBrand, { name: string; url: string; support: string }> = {
  recruitwrestlers: { name: "RecruitWrestlers", url: "https://www.recruitwrestlers.com", support: "info@recruitwrestlers.com" },
  ncunited: { name: "RecruitNC", url: "https://app.ncwrestlingunited.com", support: "info@ncwrestlingunited.com" },
}
