/**
 * Email utility for sending transactional emails
 * Uses Resend for email delivery (from: info@ncwrestlingunited.com)
 */

const FROM_BLUE = "NC Wrestling United <info@ncwrestlingunited.com>"
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

export async function sendBlueInviteEmail(to: string, registerUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping Blue invite email")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #13294B 0%, #0D1A4D 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">NC United Blue</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>You’re invited to join <strong>NC United Blue</strong> — our invite-only wrestling program.</p>
    <p>Use the link below to complete registration and payment. The link is private and will expire in 14 days.</p>
    <p style="margin: 24px 0;">
      <a href="${registerUrl}" style="display: inline-block; background: #13294B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Register for Blue</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">If the button doesn’t work, copy and paste this link into your browser:</p>
    <p style="color: #6b7280; font-size: 13px; word-break: break-all;">${registerUrl}</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px;">Questions? Reply to this email or contact <a href="mailto:info@ncwrestlingunited.com" style="color: #13294B;">info@ncwrestlingunited.com</a></p>
  </div>
</body>
</html>
    `

    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [to.trim()],
      subject: "You're invited to join NC United Blue",
      html,
    })

    if (result.error) {
      console.error("Resend Blue invite error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendBlueInviteEmail:", err)
    return { success: false, error: message }
  }
}

interface SendEditRequestNotificationParams {
  to: string
  userName: string
  athleteName: string
  status: "approved" | "rejected"
  adminNotes?: string
}

export async function sendEditRequestNotification({
  to,
  userName,
  athleteName,
  status,
  adminNotes,
}: SendEditRequestNotificationParams) {
  // Only send emails if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email notification")
    return { success: false, error: "Email service not configured" }
  }

  try {
    // Dynamic import to avoid build-time errors if Resend isn't installed
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const subject =
      status === "approved"
        ? `Your edit request for ${athleteName} has been approved`
        : `Update on your edit request for ${athleteName}`

    const statusText = status === "approved" ? "approved" : "rejected"
    const statusColor = status === "approved" ? "#10b981" : "#ef4444"

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #B31B1B 0%, #0D1A4D 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">NC Wrestling United</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Edit Request ${status === "approved" ? "Approved" : "Update"}</h2>
    
    <p>Hi ${userName},</p>
    
    <p>Your edit request for <strong>${athleteName}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
    
    ${status === "approved" ? `
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #166534;"><strong>✓ Approved!</strong> The profile has been updated with your requested changes.</p>
    </div>
    ` : `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b;"><strong>Request Rejected</strong></p>
    </div>
    `}
    
    ${adminNotes ? `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Admin Notes:</p>
      <p style="margin: 0; color: #6b7280;">${adminNotes}</p>
    </div>
    ` : ""}
    
    <p style="margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"}/athletes" 
         style="display: inline-block; background: #B31B1B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        View Profile
      </a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      If you have any questions, please contact us at 
      <a href="mailto:info@ncwrestlingunited.com" style="color: #B31B1B;">info@ncwrestlingunited.com</a>
    </p>
  </div>
</body>
</html>
    `

    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [to],
      subject,
      html,
    })

    if (result.error) {
      console.error("Resend email error:", result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true, id: result.data?.id }
  } catch (error: any) {
    console.error("Error sending email:", error)
    return { success: false, error: error?.message || "Failed to send email" }
  }
}

/** Order confirmation email for store purchases (Resend). */
export interface SendOrderConfirmationParams {
  orderNumber: string
  customerName: string
  customerEmail: string
  items: Array<{ name: string; variant: string; quantity: number; price: number }>
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  shippingAddress: Record<string, unknown>
}

export async function sendOrderConfirmationEmail(
  params: SendOrderConfirmationParams
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping order confirmation email")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { orderNumber, customerName, customerEmail, items, subtotal, shipping, tax, discount, total, shippingAddress } = params

    const itemsRows = items
      .map(
        (i) =>
          `<tr><td>${i.name} (${i.variant})</td><td>${i.quantity}</td><td>$${Number(i.price).toFixed(2)}</td></tr>`
      )
      .join("")
    const addr = shippingAddress as Record<string, string>
    const addressBlock = [addr.address1 || addr.address, addr.address2, addr.city, addr.state, addr.zipCode || addr.zip]
      .filter(Boolean)
      .join(", ")

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #003366; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">NC United Store</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hi ${customerName},</p>
    <p>Thanks for your order. Order number: <strong>${orderNumber}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead><tr style="border-bottom: 1px solid #e5e7eb;"><th style="text-align: left;">Item</th><th>Qty</th><th style="text-align: right;">Price</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <p style="margin: 8px 0;">Subtotal: $${Number(subtotal).toFixed(2)}</p>
    ${shipping > 0 ? `<p style="margin: 8px 0;">Shipping: $${Number(shipping).toFixed(2)}</p>` : ""}
    ${tax > 0 ? `<p style="margin: 8px 0;">Tax: $${Number(tax).toFixed(2)}</p>` : ""}
    ${discount > 0 ? `<p style="margin: 8px 0;">Discount: -$${Number(discount).toFixed(2)}</p>` : ""}
    <p style="margin: 16px 0; font-weight: bold;">Total: $${Number(total).toFixed(2)}</p>
    <p style="margin: 16px 0;">Shipping to: ${addressBlock}</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px;">Questions? Contact <a href="mailto:info@ncwrestlingunited.com" style="color: #003366;">info@ncwrestlingunited.com</a></p>
  </div>
</body>
</html>
    `

    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [customerEmail.trim()],
      subject: `Order ${orderNumber} confirmed – NC United Store`,
      html,
    })

    if (result.error) {
      console.error("Resend order confirmation error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendOrderConfirmationEmail:", err)
    return { success: false, error: message }
  }
}

/** New RecruitNC message notification (Resend). Used when a user has "Email me when I get new messages" on. */
export async function sendNewMessageNotificationEmail(
  to: string,
  threadName: string,
  messagePreview: string,
  inboxUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log("[RecruitNC email] Skipped (RESEND_API_KEY not set): new message notification to", to)
    }
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #003366; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">RecruitNC Messages</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>You have a new message in <strong>${escapeHtml(threadName)}</strong>.</p>
    <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 14px;">${escapeHtml(messagePreview)}</p>
    <p style="margin: 24px 0;">
      <a href="${escapeHtml(inboxUrl)}" style="display: inline-block; background: #003366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Messages</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link: ${escapeHtml(inboxUrl)}</p>
  </div>
</body>
</html>
    `

    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [to.trim()],
      subject: `New message in ${threadName} – RecruitNC`,
      html,
    })

    if (result.error) {
      console.error("[RecruitNC] Resend new-message error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendNewMessageNotificationEmail:", err)
    return { success: false, error: message }
  }
}

/** Email when a user is added to an event hub. Link goes to the team hub page. */
export async function sendAddedToHubEmail(
  to: string,
  eventName: string,
  hubUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log("[RecruitNC email] Skipped (RESEND_API_KEY not set): added to hub to", to)
    }
    return { success: false, error: "Email service not configured" }
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #003366; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">RecruitNC Team Hub</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>You've been added to <strong>${escapeHtml(eventName)}</strong>.</p>
    <p>View the team hub for roster, schedule, updates, and group chat.</p>
    <p style="margin: 24px 0;">
      <a href="${escapeHtml(hubUrl)}" style="display: inline-block; background: #003366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open hub</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste: ${escapeHtml(hubUrl)}</p>
  </div>
</body>
</html>
    `
    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [to.trim()],
      subject: `You've been added to ${eventName} – RecruitNC`,
      html,
    })
    if (result.error) {
      console.error("[RecruitNC] Resend added-to-hub error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendAddedToHubEmail:", err)
    return { success: false, error: message }
  }
}

/** Email when a user is added to a group. Link goes to the thread. */
export async function sendAddedToGroupEmail(
  to: string,
  threadName: string,
  threadUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.log("[RecruitNC email] Skipped (RESEND_API_KEY not set): added to group to", to)
    }
    return { success: false, error: "Email service not configured" }
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #003366; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">RecruitNC Messages</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>You've been added to the group <strong>${escapeHtml(threadName)}</strong>.</p>
    <p style="margin: 24px 0;">
      <a href="${escapeHtml(threadUrl)}" style="display: inline-block; background: #003366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open group</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste: ${escapeHtml(threadUrl)}</p>
  </div>
</body>
</html>
    `
    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [to.trim()],
      subject: `You've been added to ${threadName} – RecruitNC`,
      html,
    })
    if (result.error) {
      console.error("[RecruitNC] Resend added-to-group error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendAddedToGroupEmail:", err)
    return { success: false, error: message }
  }
}

/** Admin blast: subject + HTML body (e.g. from markdownToHtml). Uses branded template with logo. */
export async function sendAdminBlastEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Email service not configured" }
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const baseUrl = (SITE_URL || "").replace(/\/$/, "")
    const logoUrl = baseUrl ? `${baseUrl}/images/recruitnc-logo.png` : ""
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject.slice(0, 100))}</title></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #003366; padding: 28px 24px; text-align: center; border-radius: 8px 8px 0 0;">
      ${logoUrl ? `<img src="${logoUrl}" alt="RecruitNC — North Carolina Wrestling" width="180" height="180" style="display: inline-block; max-width: 200px; height: auto; object-fit: contain;" />` : "<h1 style=\"color: white; margin: 0; font-size: 22px;\">RecruitNC</h1>"}
    </div>
    <div style="background: #fff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
      <div style="color: #374151; font-size: 16px;">${htmlBody}</div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="color: #6b7280; font-size: 13px; margin: 0;">From NC Wrestling United / RecruitNC</p>
    </div>
  </div>
</body>
</html>
    `
    const result = await resend.emails.send({
      from: FROM_BLUE,
      to: [to.trim()],
      subject: subject.trim() || "Update from RecruitNC",
      html,
    })
    if (result.error) {
      console.error("[RecruitNC] Admin blast email error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendAdminBlastEmail:", err)
    return { success: false, error: message }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
