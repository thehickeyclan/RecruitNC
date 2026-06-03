const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

async function sendHtml(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[TOC email] RESEND_API_KEY not set, skipping:", subject)
    return
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({ from: FROM, to: [to.trim()], subject, html })
    if (result.error) console.error("[TOC email]", subject, result.error)
  } catch (e) {
    console.error("[TOC email]", subject, e)
  }
}

function wrap(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#0B1D3A;padding:20px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:white;margin:0;font-size:22px;letter-spacing:0.05em;text-transform:uppercase;">Tournament of Champions</h1></div>
<div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"><p style="color:#6b7280;font-size:14px;">NC United Wrestling · <a href="mailto:info@ncwrestlingunited.com">info@ncwrestlingunited.com</a></p></div></body></html>`
}

export async function sendTocWelcomeEmail(to: string): Promise<void> {
  await sendHtml(
    to,
    "You're on the list — Tournament of Champions 2026",
    wrap(`<p>Thanks for signing up for updates on the <strong>NC United Tournament of Champions</strong> — September 4–5, 2026 in Apex, NC.</p>
<p>We'll share field announcements, ticket info, and event details as we get closer.</p>
<p style="margin:20px 0;"><a href="https://app.ncwrestlingunited.com/tournament-of-champions" style="display:inline-block;background:#B31B1B;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">View event page</a></p>`),
  )
}

export async function sendTocNominationConfirmation(to: string, athleteName: string): Promise<void> {
  await sendHtml(
    to,
    "Nomination received — Tournament of Champions",
    wrap(`<p>We received your nomination for <strong>${athleteName}</strong> for the NC United Tournament of Champions.</p>
<p>Our team will review nominations and follow up if the athlete is selected for the 88-wrestler field. Thank you for helping us identify NC's best.</p>`),
  )
}

export async function sendTocSponsorAutoReply(to: string, company: string): Promise<void> {
  await sendHtml(
    to,
    "Sponsor inquiry received — Tournament of Champions",
    wrap(`<p>Thanks for reaching out from <strong>${company}</strong>. We've received your sponsor inquiry for the Tournament of Champions and will be in touch shortly.</p>`),
  )
}

export async function sendTocAdminNominationAlert(payload: {
  athleteName: string
  school: string | null
  weightClass: number | null
  submitterEmail: string
}): Promise<void> {
  const adminTo = process.env.TOC_ADMIN_EMAIL?.trim() || process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  if (!adminTo) return
  await sendHtml(
    adminTo,
    `New TOC nomination: ${payload.athleteName}`,
    wrap(`<p><strong>New athlete nomination</strong></p>
<ul><li>Athlete: ${payload.athleteName}</li><li>School: ${payload.school ?? "—"}</li><li>Weight: ${payload.weightClass ?? "—"}</li><li>From: ${payload.submitterEmail}</li></ul>
<p>Review in admin: Tournament of Champions → Nominations</p>`),
  )
}

export async function sendTocAdminSponsorAlert(payload: {
  company: string
  contactName: string
  contactEmail: string
}): Promise<void> {
  const adminTo = process.env.TOC_ADMIN_EMAIL?.trim() || process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  if (!adminTo) return
  await sendHtml(
    adminTo,
    `New TOC sponsor inquiry: ${payload.company}`,
    wrap(`<p><strong>New sponsor inquiry</strong></p>
<ul><li>Company: ${payload.company}</li><li>Contact: ${payload.contactName}</li><li>Email: ${payload.contactEmail}</li></ul>`),
  )
}
