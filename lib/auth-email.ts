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
  if (redirect.includes("ncwrestlingunited")) return "ncunited"
  return user.user_metadata?.signup_brand === "recruitwrestlers" ? "recruitwrestlers" : "ncunited"
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
  return { brand, emails: [linkEmail(brand, email, kind, verifyUrl(supabaseUrl, data.token_hash ?? "", type, data.redirect_to))] }
}
