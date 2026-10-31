/**
 * The account emails Supabase would otherwise send itself (confirm sign-up, reset password, sign-in
 * link, invite, change email, re-authenticate), sent in the brand of the site the person is on.
 *
 * Supabase sends one template from one address, so a family who signed up on RecruitWrestlers was
 * asked to confirm by NC United (Matt, 31 Oct 2026: "system needs to be smart enough to know").
 * With the Send Email hook switched on in Supabase, every one of those emails comes through
 * app/api/auth/email-hook instead, and the brand is decided here: the link's own site first, since
 * that is where the person is standing, then the site the account began on, then NC United.
 */

export type AuthEmailBrand = "recruitwrestlers" | "ncunited"

export type HookUser = {
  email?: string | null
  new_email?: string | null
  user_metadata?: Record<string, unknown> | null
}

export type HookEmailData = {
  token?: string
  token_hash?: string
  redirect_to?: string
  email_action_type: string
  site_url?: string
  token_new?: string
  token_hash_new?: string
}

export type AuthEmail = { to: string; subject: string; html: string; text: string }

export function brandForAuthEmail(user: HookUser, data: HookEmailData): AuthEmailBrand {
  const redirect = (data.redirect_to ?? "").toLowerCase()
  if (redirect.includes("recruitwrestlers")) return "recruitwrestlers"
  /*
   * Supabase swaps a redirect it does not allow for its Site URL (NC United), so an NC United
   * redirect on a confirmation proves nothing: a RecruitWrestlers sign-up was confirmed as NC
   * United (Matt's test, 31 Oct 2026). Where the account began decides.
   */
  if (user.user_metadata?.signup_brand === "recruitwrestlers") return "recruitwrestlers"
  return "ncunited"
}

/** A RecruitWrestlers email's link goes back to RecruitWrestlers, even when Supabase put NC United's address in. */
export function redirectForBrand(brand: AuthEmailBrand, redirectTo: string | undefined): string | undefined {
  if (!redirectTo || brand !== "recruitwrestlers") return redirectTo
  try {
    const u = new URL(redirectTo)
    if (u.hostname.includes("recruitwrestlers")) return redirectTo
    /*
     * Supabase hands the hook its bare Site URL (https://app.ncwrestlingunited.com, no path) on a
     * PKCE confirmation. The callback finishes the sign-in and reads where to go next from the
     * account (signup_return_to), so the RecruitWrestlers callback is the whole answer.
     */
    const path = u.pathname && u.pathname !== "/" ? u.pathname + u.search : "/auth/callback"
    return `https://www.recruitwrestlers.com${path}`
  } catch {
    return "https://www.recruitwrestlers.com/auth/callback"
  }
}

const BRAND = {
  recruitwrestlers: {
    name: "RecruitWrestlers",
    site: "https://www.recruitwrestlers.com",
    header: "#0B1426",
    accent: "#A3E635",
    buttonText: "#0B1426",
    wordmark: `<span style="color:#ffffff">RECRUIT</span><span style="color:#A3E635">WRESTLERS</span>`,
  },
  ncunited: {
    name: "NC United",
    site: "https://app.ncwrestlingunited.com",
    header: "#13294B",
    accent: "#13294B",
    buttonText: "#ffffff",
    wordmark: `<span style="color:#ffffff">NC UNITED</span>`,
  },
} as const

/** The sender for each brand. RecruitWrestlers' falls back to the NC United address until recruitwrestlers.com is a verified Resend domain. */
export function fromForBrand(brand: AuthEmailBrand): string {
  if (brand === "recruitwrestlers") return process.env.RW_EMAIL_FROM || "RecruitWrestlers <info@ncwrestlingunited.com>"
  return "NC United <info@ncwrestlingunited.com>"
}

/**
 * The link in the email: straight to our own callback, which checks the token on the server and
 * signs the person in. Supabase's verify link only signed in the browser the sign-up happened in;
 * opened from the Gmail app it confirmed the email and left the family signed out, short of the
 * claim (Matt's test, 31 Oct 2026). `next` is where to go after, read from what the app asked for.
 */
export function callbackUrl(brand: AuthEmailBrand, tokenHash: string, type: string, redirectTo: string | undefined): string {
  // A local or preview build keeps its own links, so the flow can be tested before it ships.
  let site: string = BRAND[brand].site
  try {
    const r = new URL(redirectTo ?? "")
    if (r.hostname === "localhost" || r.hostname.endsWith(".vercel.app")) site = r.origin
  } catch {}
  const u = new URL("/auth/callback", site)
  u.searchParams.set("token_hash", tokenHash)
  u.searchParams.set("type", type)
  let next: string | null = type === "recovery" ? "/auth/reset-password" : null
  if (!next && redirectTo) {
    try {
      const r = new URL(redirectTo)
      if (r.pathname === "/auth/callback") next = r.searchParams.get("next")
      else if (r.pathname && r.pathname !== "/") next = r.pathname + r.search
    } catch {
      next = null
    }
  }
  if (next && next.startsWith("/") && !next.startsWith("//")) u.searchParams.set("next", next)
  return u.toString()
}

/** Supabase's own verify endpoint: it checks the token and sends the person on to redirect_to. */
export function verifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string | undefined): string {
  const u = new URL("/auth/v1/verify", supabaseUrl)
  u.searchParams.set("token", tokenHash)
  u.searchParams.set("type", type)
  if (redirectTo) u.searchParams.set("redirect_to", redirectTo)
  return u.toString()
}

const COPY: Record<string, { subject: (b: string) => string; lead: (b: string) => string; button: string }> = {
  signup: {
    subject: () => "Confirm your email",
    lead: (b) => `Welcome to ${b}. Confirm your email to finish setting up your account.`,
    button: "Confirm email",
  },
  recovery: {
    subject: () => "Reset your password",
    lead: (b) => `Someone asked to reset the password on your ${b} account. Tap below to choose a new one.`,
    button: "Reset password",
  },
  magiclink: {
    subject: (b) => `Your ${b} sign-in link`,
    lead: (b) => `Tap below to sign in to ${b}. The link works once.`,
    button: "Sign in",
  },
  invite: {
    subject: (b) => `You're invited to ${b}`,
    lead: (b) => `You've been invited to ${b}. Tap below to accept and set up your account.`,
    button: "Accept invite",
  },
  email_change: {
    subject: () => "Confirm your email change",
    lead: (b) => `Confirm this change to the email address on your ${b} account.`,
    button: "Confirm change",
  },
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function layout(brand: AuthEmailBrand, lead: string, action: string): string {
  const b = BRAND[brand]
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;padding:20px;">
  <div style="background:${b.header};padding:22px 24px;border-radius:10px 10px 0 0;font-weight:900;font-size:20px;letter-spacing:.04em;">${b.wordmark}</div>
  <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <p style="margin:0 0 20px;">${escapeHtml(lead)}</p>
    ${action}
    <p style="color:#6b7280;font-size:13px;margin:24px 0 0;">If you didn't ask for this, you can ignore this email.</p>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin:16px 0 0;"><a href="${b.site}" style="color:#9ca3af;">${b.site.replace(/^https:\/\//, "")}</a></p>
</body></html>`
}

function linkEmail(brand: AuthEmailBrand, to: string, kind: string, url: string): AuthEmail {
  const b = BRAND[brand]
  const copy = COPY[kind] ?? COPY.signup
  const lead = copy.lead(b.name)
  const action = `<p style="margin:0 0 20px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:${b.accent};color:${b.buttonText};padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">${copy.button}</a></p>
    <p style="color:#6b7280;font-size:13px;margin:0;">If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all;">${escapeHtml(url)}</span></p>`
  return { to, subject: copy.subject(b.name), html: layout(brand, lead, action), text: `${lead}\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.` }
}

/**
 * The emails one hook call should send. Usually one; a secure email change sends one to each
 * address. Supabase's names are crossed there: token_hash_new goes with the current address and
 * token_hash with the new one.
 */
export function authEmailsFor(user: HookUser, data: HookEmailData, supabaseUrl: string): { brand: AuthEmailBrand; emails: AuthEmail[] } {
  const brand = brandForAuthEmail(user, data)
  data = { ...data, redirect_to: redirectForBrand(brand, data.redirect_to) }
  const b = BRAND[brand]
  const kind = data.email_action_type
  const email = user.email ?? ""

  if (kind === "reauthentication") {
    const lead = `Your ${b.name} verification code is below.`
    const action = `<p style="font-size:30px;font-weight:900;letter-spacing:.2em;margin:0 0 8px;">${escapeHtml(data.token ?? "")}</p>`
    return { brand, emails: [{ to: email, subject: `Your ${b.name} verification code`, html: layout(brand, lead, action), text: `${lead}\n\n${data.token ?? ""}` }] }
  }

  if (kind === "email_change") {
    const emails: AuthEmail[] = []
    if (data.token_hash_new && email) emails.push(linkEmail(brand, email, kind, verifyUrl(supabaseUrl, data.token_hash_new, kind, data.redirect_to)))
    if (data.token_hash && user.new_email) emails.push(linkEmail(brand, user.new_email, kind, verifyUrl(supabaseUrl, data.token_hash, kind, data.redirect_to)))
    return { brand, emails }
  }

  const type = kind === "signup" || kind === "recovery" || kind === "magiclink" || kind === "invite" ? kind : "email"
  return { brand, emails: [linkEmail(brand, email, kind, callbackUrl(brand, data.token_hash ?? "", type, data.redirect_to))] }
}
