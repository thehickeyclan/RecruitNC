/**
 * Where a family first came from (Matt, 2 Nov 2026: the funnel dashboard segments by traffic
 * source, to tell whether South Carolina lacks visitors or loses them at the claim).
 *
 * The first visit writes one cookie (components/analytics/first-touch.tsx); the claim and the
 * funnel events read it on the server and stamp it into user_analytics.event_data.first_touch.
 * Nothing before 2 Nov 2026 carries one: those rows are "before tracking", never guessed.
 */

export const FIRST_TOUCH_COOKIE = "rw_src"
/** A season: long enough to span a family's first look and the day they finally claim. */
export const FIRST_TOUCH_MAX_AGE_DAYS = 180

export type FirstTouch = {
  /** instagram, facebook, google, email, direct, or a referring site's host. */
  source: string
  /** "paid" for ads; null for everything else. */
  medium: "paid" | null
  campaign: string | null
  landing: string | null
  at: string | null
}

const OWN_HOSTS = /(^|\.)(recruitwrestlers\.com|recruitwrestlers\.ai|ncwrestlingunited\.com|wrestlingguild\.com|vercel\.app|localhost)$/i

function hostOf(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

/** One label per channel; a link's own utm tags win over the page it came from. */
export function classifyFirstTouch(input: {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  src?: string | null
  referrer?: string | null
  landing?: string | null
  at?: string | null
}): FirstTouch {
  const utm = String(input.utmSource ?? "").trim().toLowerCase()
  const medium = String(input.utmMedium ?? "").trim().toLowerCase()
  const paid = /^(paid|cpc|ppc|ads?|paid_social|paidsocial)$/.test(medium) ? "paid" : null
  const host = hostOf(input.referrer)
  const external = host && !OWN_HOSTS.test(host) ? host : null
  let source: string
  if (/^(ig|insta|instagram)$/.test(utm) || (!utm && external && /(^|\.)instagram\.com$/.test(external))) source = "instagram"
  else if (/^(fb|facebook|meta)$/.test(utm) || (!utm && external && /(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(external))) source = "facebook"
  else if (utm === "google" || (!utm && external && /(^|\.)google\.[a-z.]+$/.test(external))) source = "google"
  else if (utm === "email" || medium === "email" || /^email/.test(String(input.src ?? ""))) source = "email"
  else if (utm) source = utm.slice(0, 40)
  else if (external) source = external.slice(0, 60)
  else source = "direct"
  return {
    source,
    medium: paid,
    campaign: input.utmCampaign ? String(input.utmCampaign).slice(0, 60) : null,
    landing: input.landing ? String(input.landing).split("?")[0].slice(0, 120) : null,
    at: input.at ?? null,
  }
}

export function encodeFirstTouch(touch: FirstTouch): string {
  return encodeURIComponent(JSON.stringify(touch))
}

export function parseFirstTouch(raw: string | null | undefined): FirstTouch | null {
  if (!raw) return null
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<FirstTouch>
    if (!v || typeof v.source !== "string" || !v.source) return null
    return {
      source: v.source.slice(0, 60),
      medium: v.medium === "paid" ? "paid" : null,
      campaign: typeof v.campaign === "string" ? v.campaign.slice(0, 60) : null,
      landing: typeof v.landing === "string" ? v.landing.slice(0, 120) : null,
      at: typeof v.at === "string" ? v.at.slice(0, 40) : null,
    }
  } catch {
    return null
  }
}

/** The first touch on this request's cookie, or null when the visitor arrived before tracking. */
export function firstTouchFromRequest(request: Pick<Request, "headers">): FirstTouch | null {
  const cookie = request.headers.get("cookie") ?? ""
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${FIRST_TOUCH_COOKIE}=`))
  return parseFirstTouch(match ? match.slice(FIRST_TOUCH_COOKIE.length + 1) : null)
}

/** The label the dashboard groups by: "facebook (paid)", "instagram", "before tracking". */
export function sourceLabel(touch: Pick<FirstTouch, "source" | "medium"> | null | undefined): string {
  if (!touch?.source) return "before tracking"
  return touch.medium === "paid" ? `${touch.source} (paid)` : touch.source
}
