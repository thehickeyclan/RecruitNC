import { TOC_CONTACT_EMAIL, TOC_EVENT_DATES_DISPLAY, TOC_SATURDAY_COMPETITION_DATE } from "@/lib/toc/constants"
import { buildTocAthleteInviteMessage } from "@/lib/toc/invite-message"
import { firstNameFromAthleteName } from "@/lib/toc/invitations"

const FROM = `NC Wrestling United <${TOC_CONTACT_EMAIL}>`

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
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"><p style="color:#6b7280;font-size:14px;">NC United Wrestling · <a href="mailto:${TOC_CONTACT_EMAIL}">${TOC_CONTACT_EMAIL}</a></p></div></body></html>`
}

export async function sendTocWelcomeEmail(to: string): Promise<void> {
  await sendHtml(
    to,
    "You're on the list — Tournament of Champions 2026",
    wrap(`<p>Thanks for signing up for updates on the <strong>NC United Tournament of Champions</strong> — ${TOC_EVENT_DATES_DISPLAY} in Apex, NC.</p>
<p>We'll share field announcements, ticket info, and event details as we get closer.</p>
<p style="margin:20px 0;"><a href="https://app.ncwrestlingunited.com/tournament-of-champions" style="display:inline-block;background:#B31B1B;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">View event page</a></p>`),
  )
}

export async function sendTocAthleteInterestConfirmation(to: string, athleteName: string): Promise<void> {
  await sendHtml(
    to,
    "We received your info — Tournament of Champions",
    wrap(`<p>Hi ${athleteName},</p>
<p>We received your athlete interest form for the <strong>NC United Tournament of Champions</strong>.</p>
<p><strong>Important:</strong> Submitting this form does <strong>not</strong> guarantee an invitation or a spot in the tournament. Our staff may reach out as we evaluate prospects and build the field.</p>
<p style="margin:20px 0;"><a href="https://app.ncwrestlingunited.com/tournament-of-champions" style="display:inline-block;background:#B31B1B;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">View event page</a></p>`),
  )
}

/** @deprecated use sendTocAthleteInterestConfirmation */
export async function sendTocNominationConfirmation(to: string, athleteName: string): Promise<void> {
  return sendTocAthleteInterestConfirmation(to, athleteName)
}

export async function sendTocAdminAthleteInterestAlert(payload: {
  athleteName: string
  school: string
  club: string | null
  weightClass: number
  graduationYear: number
  email: string
}): Promise<void> {
  const adminTo = process.env.TOC_ADMIN_EMAIL?.trim() || process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  if (!adminTo) return
  await sendHtml(
    adminTo,
    `TOC prospect interest: ${payload.athleteName} (${payload.weightClass} lbs)`,
    wrap(`<p><strong>New athlete interest form</strong></p>
<ul>
<li>Name: ${payload.athleteName}</li>
<li>Email: ${payload.email}</li>
<li>School: ${payload.school}</li>
<li>Club: ${payload.club ?? "—"}</li>
<li>Weight: ${payload.weightClass} lbs</li>
<li>Grad year: ${payload.graduationYear}</li>
</ul>
<p>Review in admin: Tournament of Champions → Prospect interest</p>`),
  )
}

/** @deprecated use sendTocAdminAthleteInterestAlert */
export async function sendTocAdminNominationAlert(payload: {
  athleteName: string
  school: string | null
  weightClass: number | null
  submitterEmail: string
}): Promise<void> {
  if (payload.weightClass == null) return
  return sendTocAdminAthleteInterestAlert({
    athleteName: payload.athleteName,
    school: payload.school ?? "—",
    club: null,
    weightClass: payload.weightClass,
    graduationYear: 0,
    email: payload.submitterEmail,
  })
}

export async function sendTocSponsorAutoReply(to: string, company: string): Promise<void> {
  await sendHtml(
    to,
    "Sponsor inquiry received — Tournament of Champions",
    wrap(`<p>Thanks for reaching out from <strong>${company}</strong>. We've received your sponsor inquiry for the Tournament of Champions and will be in touch shortly.</p>`),
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

export async function sendTocMediaAutoReply(to: string, outlet: string): Promise<void> {
  await sendHtml(
    to,
    "Media request received — Tournament of Champions",
    wrap(`<p>Thanks for reaching out from <strong>${outlet}</strong>. We've received your media request for the Tournament of Champions and will follow up with credentials details and coverage guidelines.</p>`),
  )
}

export async function sendTocAdminMediaAlert(payload: {
  outlet: string
  contactName: string
  contactEmail: string
  mediaType: string | null
}): Promise<void> {
  const adminTo = process.env.TOC_ADMIN_EMAIL?.trim() || process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
  if (!adminTo) return
  await sendHtml(
    adminTo,
    `New TOC media request: ${payload.outlet}`,
    wrap(`<p><strong>New media request</strong></p>
<ul>
<li>Outlet: ${payload.outlet}</li>
<li>Contact: ${payload.contactName}</li>
<li>Email: ${payload.contactEmail}</li>
<li>Media type: ${payload.mediaType ?? "—"}</li>
</ul>`),
  )
}

export async function sendTocAthleteInviteEmail(payload: {
  to: string[]
  athleteName: string
  weightClass: number
  confirmUrl: string
}): Promise<void> {
  const firstName = firstNameFromAthleteName(payload.athleteName)
  const { subject } = buildTocAthleteInviteMessage(payload)
  const body = `<p>${firstName} —</p>
<p>This isn't a registration link. It's an <strong>invitation</strong>.</p>
<p>The NC United Tournament of Champions is invite-only — eight wrestlers per weight, the best this state has at <strong>${payload.weightClass} lbs</strong>. We built the field by hand, and your name is on it.</p>
<p><strong>${TOC_EVENT_DATES_DISPLAY}</strong> · Hope Community Church, Apex · Weigh-in Friday, brackets finish ${TOC_SATURDAY_COMPETITION_DATE}.</p>
<p style="margin:24px 0;"><a href="${payload.confirmUrl}" style="display:inline-block;background:#CC0000;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;letter-spacing:0.04em;">Confirm your spot</a></p>
<p style="font-size:14px;color:#6b7280;">You'll look up your RecruitNC profile to verify your info — no re-entering school, grad year, or club.</p>`

  for (const to of payload.to) {
    if (to.trim()) await sendHtml(to, subject, wrap(body))
  }
}

export async function sendTocAthleteConfirmedEmail(payload: {
  to: string[]
  athleteName: string
  weightClass: number
  jacketSize: string
}): Promise<void> {
  const firstName = payload.athleteName.trim().split(/\s+/)[0] || payload.athleteName
  const subject = "You're in — Tournament of Champions 2026"
  const body = `<p>${firstName} —</p>
<p><strong>Welcome to the field.</strong> Your spot at the NC United Tournament of Champions is confirmed.</p>
<ul>
<li>Weight class: <strong>${payload.weightClass} lbs</strong></li>
<li>Champion jacket size on file: <strong>${payload.jacketSize}</strong></li>
<li>Dates: <strong>${TOC_EVENT_DATES_DISPLAY}</strong></li>
</ul>
<p>Friday: weigh-in at 4:00 PM and first round. Saturday: full brackets through championship finals.</p>
<p style="margin:20px 0;"><a href="https://app.ncwrestlingunited.com/tournament-of-champions" style="display:inline-block;background:#CC0000;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Event page</a></p>`

  for (const to of payload.to) {
    if (to.trim()) await sendHtml(to, subject, wrap(body))
  }
}
