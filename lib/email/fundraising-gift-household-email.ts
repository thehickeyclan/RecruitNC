const FROM = "NC United Wrestling <info@ncwrestlingunited.com>"

export type FundraisingGiftHouseholdEmailInput = {
  to: string
  athleteName: string
  donorLabel: string
  amountDisplay: string
  /** Same rollup as the public gift page (credited gifts). */
  raisedDisplay: string
  /** Net after paid reimbursements (digital wallet), when known */
  balanceAfterPayoutsDisplay: string | null
  /** Notional available outside Guild reservations, when Guild hold > 0 */
  availableAfterGuildDisplay: string | null
  giftPageUrl: string
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

function thankReminderLine(donorLabel: string): string {
  const d = donorLabel.trim()
  if (!d || d.toLowerCase() === "anonymous" || d === "A supporter")
    return "Don&apos;t forget to thank your supporter personally."
  return `Don&apos;t forget to thank ${escapeHtml(d)} personally.`
}

export async function sendFundraisingGiftHouseholdEmail(
  data: FundraisingGiftHouseholdEmailInput,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[fundraising-gift-household-email] RESEND_API_KEY not configured")
    return { success: false, error: "Email not configured" }
  }

  const to = data.to.trim()
  if (!to) return { success: false, error: "No recipient" }

  const athlete = data.athleteName.trim() || "your athlete"
  const subject = `New gift for ${athlete} — NC United`

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;line-height:1.65;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#f0fdf4;border-radius:12px;padding:28px;border:1px solid #bbf7d0;">
<p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#14532d;">New donation</p>
<p style="margin:0 0 8px;"><strong>${escapeHtml(data.donorLabel)}</strong> gave <strong>${escapeHtml(data.amountDisplay)}</strong> to ${escapeHtml(athlete)}&apos;s campaign.</p>
<p style="margin:0 0 8px;"><strong>Total raised (campaign):</strong> ${escapeHtml(data.raisedDisplay)}</p>
${data.balanceAfterPayoutsDisplay ? `<p style="margin:0 0 8px;"><strong>Balance after NC United payouts:</strong> ${escapeHtml(data.balanceAfterPayoutsDisplay)}</p>` : ""}
${data.availableAfterGuildDisplay ? `<p style="margin:0 0 8px;"><strong>Available outside Guild hold:</strong> ${escapeHtml(data.availableAfterGuildDisplay)}</p>` : ""}
<p style="margin:16px 0 0;">${thankReminderLine(data.donorLabel)}</p>
<p style="margin:16px 0 0;"><a href="${escapeAttr(data.giftPageUrl)}" style="color:#b45309;font-weight:600;">View ${escapeHtml(athlete)}&apos;s athlete page</a></p>
<p style="margin:8px 0 0;font-size:13px;word-break:break-all;color:#334155;line-height:1.5;"><a href="${escapeAttr(data.giftPageUrl)}" style="color:#003366;">${escapeHtml(data.giftPageUrl)}</a></p>
<p style="margin:24px 0 0;font-size:13px;color:#64748b;">— NC United Wrestling</p>
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
      console.error("[fundraising-gift-household-email] Resend:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed"
    console.error("[fundraising-gift-household-email]", e)
    return { success: false, error: message }
  }
}
