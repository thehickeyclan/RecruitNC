const FROM = "NC United Wrestling <info@ncwrestlingunited.com>"

export type FundraisingActivationApprovedEmailInput = {
  to: string
  athleteName: string
  pageUrl: string
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

/**
 * Sent when staff approves a fundraising activation request — family should hear immediately.
 */
export async function sendFundraisingActivationApprovedEmail(
  data: FundraisingActivationApprovedEmailInput,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[fundraising-activation-approved-email] RESEND_API_KEY not configured")
    return { success: false, error: "Email not configured" }
  }

  const to = data.to.trim()
  if (!to) return { success: false, error: "No recipient" }

  const name = data.athleteName.trim() || "Your athlete"
  const subject = "Your NC United fundraising page is live"

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;line-height:1.65;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#f8fafc;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
<p style="margin:0 0 16px;font-size:17px;color:#0f172a;">${escapeHtml(name)}&apos;s fundraising page is now active. You can start sharing it immediately.</p>
<p style="margin:0 0 8px;"><strong>Your page:</strong><br/>
<a href="${escapeAttr(data.pageUrl)}" style="color:#b45309;font-weight:600;">${escapeHtml(data.pageUrl)}</a></p>
<p style="margin:16px 0 0;">Donations received through NC United are charitable gifts to the organization—subject to exempt purpose—not personal gifts to wrestlers; preferences you record at checkout are handled under NC United policy. Activity is tracked for families inside RecruitNC for transparency.</p>
<p style="margin:12px 0 0;">Log in to view your ledger, set a fundraising goal, and add a personal note to your page.</p>
<p style="margin:28px 0 0;font-weight:700;color:#0f172a;">Let&apos;s go. — NC United</p>
<p style="margin:24px 0 0;font-size:13px;color:#64748b;">Questions? <a href="mailto:info@ncwrestlingunited.com">info@ncwrestlingunited.com</a></p>
</div></body></html>`

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    })
    if (result.error) {
      console.error("[fundraising-activation-approved-email] Resend:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed"
    console.error("[fundraising-activation-approved-email]", e)
    return { success: false, error: message }
  }
}
