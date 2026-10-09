/**
 * The /contact form: one email to info@ (reply goes straight to the sender) and one
 * acknowledgement to the sender, so they know it arrived and what they said.
 */

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"
const STAFF_INBOX = "info@ncwrestlingunited.com"

export type ContactMessage = {
  name: string
  email: string
  subject: string
  message: string
}

export type ContactValidation = { ok: true; value: ContactMessage } | { ok: false; error: string }

const LIMITS = { name: 120, email: 254, subject: 200, message: 5000 }

export function validateContactMessage(input: unknown): ContactValidation {
  const raw = (input ?? {}) as Record<string, unknown>
  const text = (k: keyof typeof LIMITS) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : "")
  const value = { name: text("name"), email: text("email"), subject: text("subject"), message: text("message") }

  if (!value.name) return { ok: false, error: "Please enter your name." }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { ok: false, error: "Please enter a valid email address." }
  if (!value.message) return { ok: false, error: "Please enter a message." }
  for (const k of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (value[k].length > LIMITS[k]) return { ok: false, error: `Your ${k} is too long.` }
  }
  return { ok: true, value }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Header fields must not carry line breaks. */
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim()
}

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #13294B 0%, #0D1A4D 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">${title}</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">${inner}</div>
</body></html>`
}

function quoted(m: ContactMessage): string {
  return `<div style="background: #f9fafb; border-left: 3px solid #13294B; padding: 12px 16px; margin: 16px 0;">
  ${m.subject ? `<p style="margin: 0 0 8px;"><strong>${escapeHtml(m.subject)}</strong></p>` : ""}
  <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(m.message)}</p>
</div>`
}

/**
 * Staff email first: if that fails the sender is told it failed. The acknowledgement is
 * best-effort, since the message itself already reached us.
 */
export async function sendContactMessage(m: ContactMessage): Promise<{ success: boolean; acknowledged: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[contact] RESEND_API_KEY not configured")
    return { success: false, acknowledged: false, error: "Email not configured" }
  }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const subjectLine = oneLine(m.subject) || "(no subject)"

  const staff = await resend.emails.send({
    from: FROM,
    to: [STAFF_INBOX],
    replyTo: m.email,
    subject: `Contact form: ${subjectLine}`,
    html: shell(
      "New contact form message",
      `<p><strong>From:</strong> ${escapeHtml(m.name)} &lt;${escapeHtml(m.email)}&gt;</p>
       ${quoted(m)}
       <p style="color: #6b7280; font-size: 14px;">Reply to this email to answer ${escapeHtml(m.name)} directly.</p>`,
    ),
    text: `From: ${m.name} <${m.email}>\nSubject: ${subjectLine}\n\n${m.message}`,
  })
  if (staff.error) {
    console.error("[contact] staff email failed:", staff.error)
    return { success: false, acknowledged: false, error: staff.error.message }
  }

  const ack = await resend.emails.send({
    from: FROM,
    to: [m.email],
    replyTo: STAFF_INBOX,
    subject: "We got your message — NC United Wrestling",
    html: shell(
      "Thanks for getting in touch",
      `<p>Hi ${escapeHtml(m.name)},</p>
       <p>Your message reached NC United Wrestling. We read every one and will reply to this email address as soon as we can.</p>
       <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">What you sent:</p>
       ${quoted(m)}
       <p style="color: #6b7280; font-size: 14px;">Need to add something? Just reply to this email.</p>`,
    ),
    text: `Hi ${m.name},\n\nYour message reached NC United Wrestling. We will reply to this email address as soon as we can.\n\nWhat you sent:\n${m.subject ? m.subject + "\n" : ""}${m.message}\n\nNeed to add something? Just reply to this email.`,
  })
  if (ack.error) console.error("[contact] acknowledgement email failed:", ack.error)

  return { success: true, acknowledged: !ack.error }
}
