/**
 * A cookie saying which side of the site this browser's account belongs on: "1" for a college
 * coach, "0" for anyone else signed in. A hint for routing, never a credential - it is set by the
 * page once the profile is known (components/app-chrome.tsx) and read before the front page is
 * drawn (lib/coach-front-door.ts).
 */
export const PORTAL_HINT_COOKIE = "recruiting-shell"
export const COACH_HOME_PATH = "/coach-home"

/**
 * "1" when the coach's program also works with NC United (lib/recruiting/brand.ts,
 * hasCommunityAccess). Lets that coach open the NC United front page on purpose.
 */
export const PORTAL_PARTNER_COOKIE = "recruiting-partner"
