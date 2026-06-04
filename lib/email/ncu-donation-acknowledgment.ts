import { isFundraisingReceiptsPaused } from "@/lib/fundraising/fundraising-pause"
import { sendStaffEmail } from "@/lib/resend-staff-bcc"

export const NCU_WRESTLING_EIN = "99-3757238"

const FROM = "NC United Wrestling <info@ncwrestlingunited.com>"

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function firstNameFromDonorName(donorName: string | null | undefined): string {
  const t = (donorName ?? "").trim()
  if (!t) return "Friend"
  const part = t.split(/\s+/)[0] ?? t
  return part || "Friend"
}

export function formatDonationDateDisplay(donationDateIso: string, timeZone = "America/New_York") {
  const d = new Date(donationDateIso)
  if (Number.isNaN(d.getTime())) return donationDateIso
  return d.toLocaleDateString("en-US", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatAmountUsdFromCents(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amountCents / 100)
}

export function buildNcuDonationAcknowledgmentHtml(input: {
  firstName: string
  amountCents: number
  /** ISO string — only the calendar day is shown (ET) */
  donationDateIso: string
}) {
  const first = (input.firstName || "Friend").trim() || "Friend"
  const amount = formatAmountUsdFromCents(input.amountCents)
  const dateLine = formatDonationDateDisplay(input.donationDateIso)

  const textBodyCore = `Hi ${first},

Thank you for your support of NC United Wrestling.

This email serves as your official acknowledgment for your charitable contribution:

Organization: NC United Wrestling
EIN: ${NCU_WRESTLING_EIN}
Date: ${dateLine}
Amount: ${amount}

NC United Wrestling is a registered 501(c)(3) nonprofit organization.

Your contribution supports athlete training, travel, and competition opportunities across North Carolina.

No goods or services were provided in exchange for this contribution.

Please keep this email for your tax records — it is your written acknowledgment of this gift consistent with IRC documentation standards for charitable contributions. Whether your gift may be deducted on your return depends on your tax situation — consult your tax advisor or CPA.

If you have questions about this acknowledgement, reply to this message — we'll help.`

  const textBody = `${textBodyCore}

We appreciate your support.

— NC United Wrestling`

  const safeText = textBody
  const mainHtmlBlock = escapeHtml(textBodyCore).replace(/\n/g, "<br/>\n")

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#f8fafc;border-radius:8px;padding:24px 28px;border:1px solid #e2e8f0;">
${mainHtmlBlock}
<p style="margin:16px 0 0;">We appreciate your support.</p>
<p style="margin:8px 0 0;">— NC United Wrestling</p>
</div>
</body>
</html>`

  return { html, text: safeText, subject: "Your NC United contribution acknowledgment" as const, from: FROM }
}

export async function sendNcuDonationAcknowledgmentEmail(input: {
  to: string
  firstName: string
  amountCents: number
  donationDateIso: string
}): Promise<{ success: true } | { success: false; error: string }> {
  if (isFundraisingReceiptsPaused()) {
    return {
      success: false,
      error: "Receipt sending is temporarily paused (RECRUITNC_FUNDRAISING_RECEIPTS_PAUSED).",
    }
  }
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY is not configured" }
  }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { html, text, subject, from } = buildNcuDonationAcknowledgmentHtml({
    firstName: input.firstName,
    amountCents: input.amountCents,
    donationDateIso: input.donationDateIso,
  })

  const result = await sendStaffEmail(resend, {
    from,
    to: [input.to.trim()],
    subject,
    html,
    text,
    replyTo: "info@ncwrestlingunited.com",
  })

  if (result.error) {
    return { success: false, error: result.error.message ?? "Resend error" }
  }
  return { success: true }
}
