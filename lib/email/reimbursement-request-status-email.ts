const FROM = "NC Wrestling United <info@ncwrestlingunited.com>"

function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com").replace(
    /\/$/,
    "",
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export type ReimbursementStatusEmailKind = "approved" | "rejected" | "paid"

export type SendReimbursementRequestStatusEmailParams = {
  to: string
  parentDisplayName: string
  athleteName: string
  kind: ReimbursementStatusEmailKind
  /** Cents: approved/paid line shown to parent */
  amountCents: number
  adminNotes: string | null
}

export async function sendReimbursementRequestStatusEmail(
  params: SendReimbursementRequestStatusEmailParams,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[RecruitNC] Reimbursement email: RESEND_API_KEY not set")
    return { success: false, error: "Email service not configured" }
  }

  const { to, parentDisplayName, athleteName, kind, amountCents, adminNotes } = params
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100)
  const profileUrl = `${siteUrl()}/profile`

  const title =
    kind === "approved"
      ? "Reimbursement request approved"
      : kind === "rejected"
        ? "Reimbursement request update"
        : "Reimbursement marked paid"

  const subject =
    kind === "approved"
      ? `RecruitNC: Reimbursement approved (${money} for ${athleteName})`
      : kind === "rejected"
        ? `RecruitNC: Reimbursement request update (${athleteName})`
        : `RecruitNC: Reimbursement paid (${money} for ${athleteName})`

  const bodyIntro =
    kind === "approved"
      ? `Your reimbursement request for <strong>${escapeHtml(athleteName)}</strong> was <strong>approved</strong> for <strong>${escapeHtml(money)}</strong>.`
      : kind === "rejected"
        ? `Your reimbursement request for <strong>${escapeHtml(athleteName)}</strong> was <strong>not approved</strong>.`
        : `Your reimbursement for <strong>${escapeHtml(athleteName)}</strong> has been marked <strong>paid</strong> (${escapeHtml(money)}).`

  const extraRejected =
    kind === "rejected" && adminNotes?.trim()
      ? `<p style="margin:16px 0 0; padding:12px; background:#fef2f2; border-left:4px solid #B31B1B; border-radius:4px; color:#444;"><strong>Notes:</strong> ${escapeHtml(adminNotes.trim())}</p>`
      : kind === "approved" && adminNotes?.trim()
        ? `<p style="margin:16px 0 0; padding:12px; background:#f8fafc; border-left:4px solid #003366; border-radius:4px; color:#444;"><strong>Notes from staff:</strong> ${escapeHtml(adminNotes.trim())}</p>`
        : ""

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
<div style="background:linear-gradient(135deg, #B31B1B 0%, #002147 100%); padding:20px; text-align:center; border-radius:8px 8px 0 0;">
  <p style="color:#CBAF5D; margin:0; font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">RecruitNC</p>
  <h1 style="color:#fff; margin:8px 0 0; font-size:20px;">${escapeHtml(title)}</h1>
</div>
<div style="background:#fff; padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 8px 8px;">
  <p>Hi ${escapeHtml(parentDisplayName)},</p>
  <p>${bodyIntro}</p>
  ${extraRejected}
  <p style="margin:24px 0 0;"><a href="${escapeHtml(profileUrl)}" style="display:inline-block;background:#03154C;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open My Profile</a></p>
  <p style="color:#64748b;font-size:14px;margin-top:20px;">In the app: <strong>Profile</strong> → <strong>Fundraise</strong> → <strong>Reimbursement requests</strong>.</p>
  <p style="color:#64748b;font-size:14px;">Questions? <a href="mailto:info@ncwrestlingunited.com" style="color:#003366;">info@ncwrestlingunited.com</a></p>
</div>
</body></html>`

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: FROM,
      to: [to.trim()],
      subject,
      html,
    })
    if (result.error) {
      console.error("[RecruitNC] Reimbursement status email", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed"
    console.error("[RecruitNC] Reimbursement status email", e)
    return { success: false, error: message }
  }
}
