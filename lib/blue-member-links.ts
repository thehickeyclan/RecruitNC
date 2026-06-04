const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

/** Public program page — safe before registration. */
export const BLUE_PUBLIC_PAGE_URL = `${SITE_URL}/blue`

/** NC United calendar — practices and events. */
export const NC_UNITED_CALENDAR_URL = `${SITE_URL}/calendar`

/** Member-only — include in post-registration welcome email only. */
export const BLUE_GROUPME_URL =
  process.env.BLUE_GROUPME_URL || "https://groupme.com/join_group/104706096/bU0Ncyo4"

export const NC_UNITED_STORE_URL = `${SITE_URL}/store`

/** Blue member store discount — apply at cart checkout. */
export const BLUE_STORE_PROMO_CODE = "NCUBLUE"

/** Profile billing section anchor. */
export const BLUE_PROFILE_BILLING_URL = `${SITE_URL}/profile#nc-united-blue`

export const BLUE_BILLING_HELP_URL = `${SITE_URL}/blue/billing`

export const RECRUITNC_PROFILE_URL = `${SITE_URL}/profile`

export const RECRUITNC_SIGNIN_URL = `${SITE_URL}/auth/signin`
