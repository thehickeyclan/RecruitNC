/**
 * Confirmation email after NC United calendar drop-in payment (Stripe webhook).
 */

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

export type DropInApprovalEmailInput = {
  recipientEmail: string
  recipientName: string
  eventTitle: string
  eventDate: string
  eventTime?: string | null
  eventLocation?: string | null
  registrationLink?: string | null
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

export async function sendDropInApprovalEmail(data: DropInApprovalEmailInput): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[drop-in email] RESEND_API_KEY not configured")
    return { success: false, error: "Email not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#f8fafc;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
<p style="color:#059669;font-weight:700;font-size:18px;">Your drop-in is confirmed</p>
<h1 style="color:#002147;margin:8px 0 16px;">${escapeHtml(data.eventTitle)}</h1>
<p>Hi ${escapeHtml(data.recipientName)},</p>
<p>Payment went through. Here are the session details:</p>
<ul style="padding-left:20px;">
<li><strong>Date:</strong> ${formatDate(data.eventDate)}</li>
${data.eventTime ? `<li><strong>Time:</strong> ${formatTime(data.eventTime)}</li>` : ""}
${data.eventLocation ? `<li><strong>Location:</strong> ${escapeHtml(data.eventLocation)}</li>` : ""}
</ul>
${
  data.registrationLink
    ? `<p><a href="${escapeAttr(data.registrationLink)}" style="display:inline-block;background:#002147;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Complete registration</a></p>`
    : ""
}
<p style="color:#64748b;font-size:14px;margin-top:24px;">Questions? <a href="mailto:info@ncwrestlingunited.com">info@ncwrestlingunited.com</a></p>
</div></body></html>`

    const result = await resend.emails.send({
      from: FROM,
      to: [data.recipientEmail.trim()],
      subject: `Drop-in confirmed: ${data.eventTitle}`,
      html,
    })

    if (result.error) {
      console.error("[drop-in email] Resend:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed"
    console.error("[drop-in email]", e)
    return { success: false, error: message }
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}
