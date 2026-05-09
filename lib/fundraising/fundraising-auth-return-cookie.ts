/** HttpOnly cookie set by root middleware for protected `/fundraising/*` routes so `(giving-auth)` layout can build `returnTo` without mutating request headers (unsafe on Vercel Edge). */
export const FUNDRAISING_AUTH_RETURN_COOKIE = "fundraising_auth_return"
