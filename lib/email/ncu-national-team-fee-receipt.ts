import { NCU_WRESTLING_EIN, formatDonationDateDisplay } from "@/lib/email/ncu-donation-acknowledgment"

const FROM = "NC United Wrestling <info@ncwrestlingunited.com>"

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatAmountUsdFromCents(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amountCents / 100)
}

export function buildNcuNationalTeamFeeReceiptHtml(input: {
  firstName: string
  amountCents: number
  paymentDateIso: string
  athleteFullName: string
  programLabel: string
}) {
  const first = (input.firstName || "Friend").trim() || "Friend"
  const amount = formatAmountUsdFromCents(input.amountCents)
  const dateLine = formatDonationDateDisplay(input.paymentDateIso)
  const athlete = (input.athleteFullName || "").trim() || "your athlete"
  const program = (input.programLabel || "National Team (NHSCA)").trim()

  const textBody = `Hi ${first},

Thank you for your payment to NC United Wrestling.

This email is your receipt for National Team program fees:

Program: ${program}
Athlete: ${athlete}
Organization: NC United Wrestling
EIN: ${NCU_WRESTLING_EIN}
Date: ${dateLine}
Amount paid: ${amount}

Please keep this email for your records. If you have questions, reply to this message and we will help.

— NC United Wrestling`

  const safeHtml = escapeHtml(textBody).replace(/\n/g, "<br/>\n")

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:#f8fafc;border-radius:8px;padding:24px 28px;border:1px solid #e2e8f0;">
${safeHtml}
</div>
</body>
</html>`

  return {
    html,
    text: textBody,
    subject: "Your NC United National Team payment receipt" as const,
    from: FROM,
  }
}

export async function sendNcuNationalTeamFeeReceiptEmail(input: {
  to: string
  firstName: string
  amountCents: number
  paymentDateIso: string
  athleteFullName: string
  programLabel: string
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY is not configured" }
  }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { html, text, subject, from } = buildNcuNationalTeamFeeReceiptHtml({
    firstName: input.firstName,
    amountCents: input.amountCents,
    paymentDateIso: input.paymentDateIso,
    athleteFullName: input.athleteFullName,
    programLabel: input.programLabel,
  })

  const result = await resend.emails.send({
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
