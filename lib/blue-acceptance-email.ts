/**
 * The "you are in" email.
 *
 * Getting into Blue had no moment. A family filled in the interest form and then, at some point,
 * received a private registration link - which is a task, not a welcome. This is the note that
 * says congratulations and then tells them the six or seven things every new family asks in
 * their first week, so nobody has to ask them one at a time.
 *
 * Sent by hand from the interest list, because deciding who is in is a person's job.
 */

const FROM_BLUE = "NC Wrestling United <info@ncwrestlingunited.com>"
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

export const BLUE_GROUPME_URL = "https://groupme.com/join_group/104706096/bU0Ncyo4"
export const BLUE_INSTAGRAM_URL = "https://instagram.com/ncwrestlingunited"
export const BLUE_APP_STORE_URL = "https://apps.apple.com/app/id6803202791"
export const BLUE_CONTACT_EMAIL = "info@ncwrestlingunited.com"
export const BLUE_CONTACT_CELL = "631.662.5409"
/* Absolute, because an email client has no site to resolve a relative path against. */
export const BLUE_LOGO_URL = `${SITE_URL}/images/nc-united-logo-white.png`

type Step = { title: string; body: string; href?: string; cta?: string }

function steps(registerUrl: string | null): Step[] {
  return [
    /* Registration leads: it is the only step with a deadline behind it. */
    ...(registerUrl
      ? [
          {
            title: "Complete your registration",
            body: "One private link, just for your family. It covers the waiver, billing, and the size for your free NC United Blue shirt. Start here - the rest can wait.",
            href: registerUrl,
            cta: "Complete registration",
          },
        ]
      : []),
    {
      title: "Join the GroupMe",
      body: "Where practice changes, last-minute notes and everything else get posted first. Turn notifications on.",
      href: BLUE_GROUPME_URL,
      cta: "Join the GroupMe",
    },
    {
      title: "Set up your wrestler's profile",
      body: "Claim the profile if it already exists, or create one. This is the page college coaches read - results, film, academics.",
      href: `${SITE_URL}/profile`,
      cta: "Open my account",
    },
    {
      title: "Check the calendar",
      body: "Next practice and the key dates for the season are all on it.",
      href: `${SITE_URL}/calendar`,
      cta: "See the calendar",
    },
    {
      title: "Most practices are at UNC, alternating Sundays, 1-3pm",
      body: "That is the usual pattern rather than a promise - always check the calendar before you drive.",
    },
    {
      title: "Follow us on Instagram",
      body: "Results, announcements and the things worth seeing from the weekend.",
      href: BLUE_INSTAGRAM_URL,
      cta: "@ncwrestlingunited",
    },
    {
      title: "Kit up at the NC United store",
      body: "Singlets, tees, hoodies and warmups. Your free member shirt comes separately - this is everything else.",
      href: `${SITE_URL}/store-app`,
      cta: "Visit the store",
    },
    {
      title: "Your rankings access is included",
      body: "Every class ranking and the Top 75 College Prospects come with Blue. No separate subscription.",
      href: `${SITE_URL}/public-rankings`,
      cta: "Open the rankings",
    },
    {
      title: "Download the iPhone app and turn alerts on",
      body: "Alerts are how you hear that a college coach looked at your wrestler's profile, and when rankings are published.",
      href: BLUE_APP_STORE_URL,
      cta: "Get the app",
    },
  ]
}

function stepHtml(s: Step, n: number): string {
  const button = s.href
    ? `<p style="margin:10px 0 0;"><a href="${s.href}" style="display:inline-block;background:#03154C;color:#ffffff;padding:9px 18px;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${s.cta}</a></p>`
    : ""
  return `<tr>
    <td style="padding:0 0 22px;vertical-align:top;width:34px;">
      <div style="width:26px;height:26px;border-radius:13px;background:#D3B574;color:#03154C;font-weight:700;font-size:13px;text-align:center;line-height:26px;">${n}</div>
    </td>
    <td style="padding:0 0 22px;vertical-align:top;">
      <p style="margin:0;font-weight:700;color:#03154C;font-size:15px;">${s.title}</p>
      <p style="margin:4px 0 0;color:#4b5563;font-size:14px;line-height:1.5;">${s.body}</p>
      ${button}
    </td>
  </tr>`
}

export const BLUE_ACCEPTANCE_SUBJECT = "Welcome to NC United Blue"

/** Rendered separately from sending so the admin can read the real thing before it goes. */
export function renderBlueAcceptanceEmail(params: {
  athleteName?: string | null
  registerUrl?: string | null
}): { subject: string; html: string; text: string } {
  const athlete = (params.athleteName || "").trim()
  const list = steps(params.registerUrl?.trim() || null)

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="background:#03154C;padding:26px 28px;">
          <img src="${BLUE_LOGO_URL}" alt="NC United" width="132" style="display:block;border:0;margin:0 0 14px;max-width:132px;height:auto;" />
          <p style="margin:0;color:#D3B574;font-size:11px;letter-spacing:2px;font-weight:700;">NC UNITED BLUE</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;">You&rsquo;re in${athlete ? `, ${athlete}` : ""}.</h1>
          ${
            params.registerUrl?.trim()
              ? `<p style="margin:18px 0 0;"><a href="${params.registerUrl.trim()}" style="display:inline-block;background:#D3B574;color:#03154C;padding:13px 26px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Complete your registration</a></p>
                 <p style="margin:8px 0 0;color:#ffffff;opacity:.7;font-size:12px;">This link is just for your family.</p>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:26px 28px 6px;">
          <p style="margin:0 0 22px;color:#111827;font-size:15px;line-height:1.6;">
            Congratulations &mdash; you are part of the NC United Blue program. We are glad to have you.
            Here is everything you need for your first week.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${list.map((s, i) => stepHtml(s, i + 1)).join("")}
          </table>
        </td></tr>
        <tr><td style="padding:4px 28px 28px;">
          <div style="border-top:1px solid #e5e7eb;padding-top:18px;">
            <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">
              Questions about any of it &mdash; email
              <a href="mailto:${BLUE_CONTACT_EMAIL}" style="color:#03154C;font-weight:600;">${BLUE_CONTACT_EMAIL}</a>
              or text Matt at
              <a href="tel:+16316625409" style="color:#03154C;font-weight:600;">${BLUE_CONTACT_CELL}</a>.
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const text = [
    `You're in${athlete ? `, ${athlete}` : ""}.`,
    "",
    "Congratulations - you are part of the NC United Blue program.",
    "",
    ...list.flatMap((s, i) => [`${i + 1}. ${s.title}`, `   ${s.body}`, s.href ? `   ${s.href}` : "", ""]),
    `Questions: ${BLUE_CONTACT_EMAIL} or text Matt at ${BLUE_CONTACT_CELL}.`,
  ].join("\n")

  return { subject: BLUE_ACCEPTANCE_SUBJECT, html, text }
}

export async function sendBlueAcceptanceEmail(params: {
  to: string
  athleteName?: string | null
  registerUrl?: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Email service not configured" }
  }
  const { subject, html, text } = renderBlueAcceptanceEmail(params)
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_BLUE,
      to: params.to,
      subject,
      html,
      text,
      replyTo: BLUE_CONTACT_EMAIL,
    })
    if (error) return { success: false, error: String((error as { message?: string }).message ?? error) }
    return { success: true }
  } catch (caught) {
    return { success: false, error: caught instanceof Error ? caught.message : "Send failed" }
  }
}

/**
 * Tell staff a family just registered, and what size shirt to bring.
 *
 * The size was captured from the first signup and then only readable one member at a time on a
 * detail page, so the answer to "what size does the new kid need" was a click hunt. Nothing
 * announced a registration at all.
 */
export async function sendBlueRegistrationAlert(params: {
  athleteName: string
  tshirtSize: string | null
  graduationYear?: number | string | null
  highSchool?: string | null
  parentEmail?: string | null
  parentPhone?: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) return { success: false, error: "Email service not configured" }
  const size = (params.tshirtSize || "").trim() || "NOT GIVEN"
  const facts: Array<[string, string]> = [
    ["Shirt size", size],
    ["Class", String(params.graduationYear ?? "—")],
    ["High school", params.highSchool || "—"],
    ["Parent", [params.parentEmail, params.parentPhone].filter(Boolean).join(" · ") || "—"],
  ]
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:480px;">
    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;letter-spacing:1px;font-weight:700;">NC UNITED BLUE</p>
    <h2 style="margin:0 0 6px;color:#03154C;font-size:20px;">${params.athleteName} registered</h2>
    <p style="margin:0 0 16px;font-size:26px;font-weight:700;color:#03154C;">Shirt: ${size}</p>
    <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;">
      ${facts.map(([k, v]) => `<tr><td style="padding:2px 14px 2px 0;color:#6b7280;">${k}</td><td style="padding:2px 0;font-weight:600;">${v}</td></tr>`).join("")}
    </table>
  </div>`
  const text = `${params.athleteName} registered.\nShirt: ${size}\n` + facts.map(([k, v]) => `${k}: ${v}`).join("\n")
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_BLUE,
      to: BLUE_CONTACT_EMAIL,
      subject: `Blue registration — ${params.athleteName} — shirt ${size}`,
      html,
      text,
    })
    if (error) return { success: false, error: String((error as { message?: string }).message ?? error) }
    return { success: true }
  } catch (caught) {
    return { success: false, error: caught instanceof Error ? caught.message : "Send failed" }
  }
}
