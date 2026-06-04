import { sendStaffEmail } from "@/lib/resend-staff-bcc"

const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

export async function sendScholarshipApplicationEmails(params: {
  nominatorEmail: string
  nominatorName: string
  scholarshipName: string
  athleteName: string
  anonymousId: string | null
  applicationsCloseDate: string | null
  awardAnnouncementDate: string | null
  adminNotifyEmail?: string | null
  submissionFormat?: "written" | "video"
  videoUrl?: string | null
  videoBlobUrl?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[scholarships] RESEND_API_KEY missing — skipping application emails")
    return { ok: false, error: "Email not configured" }
  }

  const site = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
  const hub = `${site.replace(/\/$/, "")}/fundraising/scholarships`
  const adminScholarshipsUrl = `${site.replace(/\/$/, "")}/admin/scholarships`

  const closeLine = params.applicationsCloseDate
    ? `Applications close <strong>${escapeHtml(params.applicationsCloseDate)}</strong>.`
    : "We will publish key dates on the scholarship page."
  const announceLine = params.awardAnnouncementDate
    ? `Award plans are communicated around <strong>${escapeHtml(params.awardAnnouncementDate)}</strong>; we'll email you if we need anything before then.`
    : "You'll hear from us if we need anything else."

  const blindLine = params.anonymousId
    ? `<p>Your nomination is recorded under blind-review id <strong>${escapeHtml(params.anonymousId)}</strong>. The selection committee scores applications without seeing the athlete's name or school until finalists are chosen.</p>`
    : `<p>Applications are reviewed with identity protected until finalists are chosen.</p>`

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const nominatorHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${escapeHtml(params.nominatorName)},</p>
  <p>Thank you — we received your nomination for <strong>${escapeHtml(params.athleteName)}</strong> for <strong>${escapeHtml(params.scholarshipName)}</strong>.</p>
  ${blindLine}
  <p>${closeLine}</p>
  <p>${announceLine}</p>
  <p style="margin-top:28px;color:#64748b;font-size:14px;">NC United Wrestling · Scholarships<br/><a href="${hub}">${hub}</a></p>
</body></html>`

    const nomResult = await sendStaffEmail(resend, {
      from: FROM,
      to: [params.nominatorEmail.trim()],
      subject: `Your nomination has been received — ${params.scholarshipName}`,
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

    const anonAdmin = params.anonymousId
      ? `<li><strong>Blind-review id:</strong> ${escapeHtml(params.anonymousId)}</li>`
      : ""

    const format = params.submissionFormat === "video" ? "video" : "written"
    const videoLines =
      format === "video"
        ? `<li><strong>Format:</strong> video</li>
    ${params.videoUrl ? `<li><strong>Video link:</strong> <a href="${escapeAttr(params.videoUrl)}">${escapeHtml(params.videoUrl)}</a></li>` : ""}
    ${params.videoBlobUrl ? `<li><strong>Uploaded file:</strong> <a href="${escapeAttr(params.videoBlobUrl)}">${escapeHtml(params.videoBlobUrl)}</a></li>` : ""}`
        : `<li><strong>Format:</strong> written essay</li>`

    const adminHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px;">
  <p>New scholarship application</p>
  <ul>
    <li><strong>Scholarship:</strong> ${escapeHtml(params.scholarshipName)}</li>
    ${anonAdmin}
    ${videoLines}
    <li><strong>Nominator:</strong> ${escapeHtml(params.nominatorName)} (${escapeHtml(params.nominatorEmail)})</li>
  </ul>
  <p style="margin-top:16px;"><a href="${adminScholarshipsUrl}">Open scholarship admin</a></p>
</body></html>`

    const admResult = await sendStaffEmail(resend, {
      from: FROM,
      to: [adminTo.trim()],
      subject: `New ${params.scholarshipName} application`,
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

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;")
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
