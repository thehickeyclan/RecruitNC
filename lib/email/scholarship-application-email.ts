const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

export async function sendScholarshipApplicationEmails(params: {
  nominatorEmail: string
  nominatorName: string
  scholarshipName: string
  athleteName: string
  adminNotifyEmail?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[scholarships] RESEND_API_KEY missing — skipping application emails")
    return { ok: false, error: "Email not configured" }
  }

  const site = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
  const hub = `${site.replace(/\/$/, "")}/fundraising/scholarships`

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const nominatorHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(params.nominatorName)},</p>
  <p>Thank you — we received your nomination for <strong>${escapeHtml(params.athleteName)}</strong> for the <strong>${escapeHtml(params.scholarshipName)}</strong>.</p>
  <p>The NC United team will review applications during the published window. If we need anything else, we&apos;ll reach out by email.</p>
  <p style="margin-top:28px;color:#64748b;font-size:14px;">NC United Wrestling · Scholarships<br/><a href="${hub}">${hub}</a></p>
</body></html>`

    const nomResult = await resend.emails.send({
      from: FROM,
      to: [params.nominatorEmail.trim()],
      subject: `Received — ${params.scholarshipName}`,
      html: nominatorHtml,
    })
    if (nomResult.error) {
      console.error("[scholarships] Resend nominator:", nomResult.error)
      return { ok: false, error: nomResult.error.message }
    }

    const adminTo =
      (params.adminNotifyEmail && params.adminNotifyEmail.includes("@") ? params.adminNotifyEmail : null) ||
      process.env.SCHOLARSHIP_ADMIN_NOTIFY_EMAIL ||
      "info@ncwrestlingunited.com"

    const adminHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px;">
  <p>New scholarship application</p>
  <ul>
    <li><strong>Scholarship:</strong> ${escapeHtml(params.scholarshipName)}</li>
    <li><strong>Athlete:</strong> ${escapeHtml(params.athleteName)}</li>
    <li><strong>Nominator:</strong> ${escapeHtml(params.nominatorName)} (${escapeHtml(params.nominatorEmail)})</li>
  </ul>
</body></html>`

    const admResult = await resend.emails.send({
      from: FROM,
      to: [adminTo.trim()],
      subject: `[Scholarship] New application — ${params.scholarshipName}`,
      html: adminHtml,
    })
    if (admResult.error) {
      console.error("[scholarships] Resend admin:", admResult.error)
    }

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send failed"
    console.error("[scholarships] sendScholarshipApplicationEmails:", e)
    return { ok: false, error: msg }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
