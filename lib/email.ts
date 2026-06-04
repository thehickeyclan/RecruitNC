/**
 * Email utility for sending transactional emails
 * Uses Resend for email delivery (from: info@ncwrestlingunited.com)
 */

import { sendStaffEmail } from "@/lib/resend-staff-bcc"
import {
  BLUE_BILLING_HELP_URL,
  BLUE_GROUPME_URL,
  BLUE_PROFILE_BILLING_URL,
  BLUE_STORE_PROMO_CODE,
  NC_UNITED_CALENDAR_URL,
  NC_UNITED_STORE_URL,
  RECRUITNC_PROFILE_URL,
  RECRUITNC_SIGNIN_URL,
} from "@/lib/blue-member-links"

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

    const result = await sendStaffEmail(resend, {
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

export type BlueWelcomeEmailParams = {
  to: string
  parentName: string
  athleteName: string
  passwordSetupUrl?: string | null
}

export function buildBlueWelcomeEmailHtml(params: BlueWelcomeEmailParams): string {
  const parentName = (params.parentName || "there").trim()
  const athleteName = (params.athleteName || "your athlete").trim()
  const passwordBlock = params.passwordSetupUrl
    ? `<p style="margin: 20px 0;">
      <a href="${params.passwordSetupUrl}" style="display: inline-block; background: #03154C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set your password &amp; sign in</a>
    </p>
    <p style="color: #6b7280; font-size: 14px;">Use the same email you registered with. This link expires in 24 hours.</p>`
    : `<p style="margin: 20px 0;">
      <a href="${RECRUITNC_SIGNIN_URL}" style="display: inline-block; background: #03154C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign in to RecruitNC</a>
    </p>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #03154C 0%, #0A1628 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Welcome to NC United Blue</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hi ${parentName},</p>
    <p>Payment is complete — <strong>${athleteName}</strong> is enrolled in NC United Blue. Here&apos;s everything you need to get started.</p>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Practices</h2>
    <p><strong>Sundays, 1:00–3:00 PM</strong><br>UNC Fetzer Hall · Chapel Hill</p>
    <p style="color: #6b7280; font-size: 14px;">Plan to arrive ready to train. Check the calendar for any schedule updates.</p>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Stay connected</h2>
    <ul style="padding-left: 20px; margin: 12px 0;">
      <li style="margin-bottom: 8px;"><a href="${BLUE_GROUPME_URL}" style="color: #03154C; font-weight: bold;">Join NC United Blue on GroupMe</a> — team chat and practice updates</li>
      <li><a href="${NC_UNITED_CALENDAR_URL}" style="color: #03154C; font-weight: bold;">View the NC United calendar</a> — practices, events, and schedule</li>
    </ul>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Keep your RecruitNC recruiting profile current</h2>
    <p>College coaches use RecruitNC to find NC wrestlers. Sign in and keep your athlete&apos;s profile accurate and complete:</p>
    <ul style="padding-left: 20px; margin: 12px 0;">
      <li>GPA and academic info</li>
      <li>Cell phone and contact info</li>
      <li>Weight class, high school, and club</li>
      <li>Recruiting status, achievements, and highlight links</li>
    </ul>
    <p style="margin: 16px 0;">
      <a href="${RECRUITNC_PROFILE_URL}" style="color: #03154C; font-weight: bold;">Update recruiting profile →</a>
    </p>
    ${passwordBlock}

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">Manage your subscription</h2>
    <p>Sign in to RecruitNC → <strong>Profile → NC United Blue</strong> to:</p>
    <ul style="padding-left: 20px; margin: 12px 0;">
      <li>View next bill date and payment history</li>
      <li>Update your card (Stripe billing portal)</li>
      <li>Pause or cancel your membership</li>
      <li>Retry a failed payment</li>
    </ul>
    <p style="margin: 16px 0;">
      <a href="${BLUE_PROFILE_BILLING_URL}" style="color: #03154C; font-weight: bold;">Open billing in your profile →</a><br>
      <a href="${BLUE_BILLING_HELP_URL}" style="color: #6b7280; font-size: 14px;">Billing help: ${BLUE_BILLING_HELP_URL}</a>
    </p>

    <h2 style="color: #03154C; font-size: 16px; margin-top: 24px;">NC United Store</h2>
    <p>Blue members receive <strong>20% off</strong> NC United Store apparel and gear. At checkout, enter promo code <strong>${BLUE_STORE_PROMO_CODE}</strong>.</p>
    <p style="margin: 12px 0;">
      <a href="${NC_UNITED_STORE_URL}" style="color: #03154C; font-weight: bold;">Shop the NC United Store →</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px;">Questions? <a href="mailto:info@ncwrestlingunited.com" style="color: #03154C;">info@ncwrestlingunited.com</a></p>
  </div>
</body>
</html>`
}

/** Post-payment welcome: practices, GroupMe, calendar, profile, billing management. */
export async function sendBlueWelcomeEmail(params: BlueWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping Blue welcome email")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const result = await sendStaffEmail(resend, {
      from: FROM_BLUE,
      to: [params.to.trim()],
      subject: `Welcome to NC United Blue — next steps`,
      html: buildBlueWelcomeEmailHtml(params),
    })

    if (result.error) {
      console.error("Resend Blue welcome error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendBlueWelcomeEmail:", err)
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

    const result = await sendStaffEmail(resend, {
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

function escapeHtmlReceipt(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Variant from order_items JSON / cart — hide useless "N/A / N/A" in receipts. */
export function formatOrderItemVariantForEmail(variant: unknown): string {
  if (variant == null) return ""
  if (typeof variant === "string") {
    const t = variant.trim()
    if (!t || /^n\/a(\s*\/\s*n\/a)?$/i.test(t)) return ""
    return t
  }
  if (typeof variant === "object" && !Array.isArray(variant)) {
    const o = variant as Record<string, unknown>
    const c = String(o.color ?? "").trim()
    const s = String(o.size ?? "").trim()
    const isBad = (x: string) => !x || /^n\/a$/i.test(x)
    if (isBad(c) && isBad(s)) return ""
    if (isBad(c)) return s
    if (isBad(s)) return c
    return `${c} / ${s}`
  }
  return ""
}

/** Shipping JSON from checkout / Stripe — single-line summary for emails. */
export function formatStoreShippingAddressPlain(shippingAddress: Record<string, unknown> | null | undefined): string {
  if (!shippingAddress || typeof shippingAddress !== "object") return ""
  const a = shippingAddress as Record<string, unknown>
  const str = (k: string) => {
    const v = a[k]
    return v != null && String(v).trim() ? String(v).trim() : ""
  }
  const name = [str("firstName"), str("lastName")].filter(Boolean).join(" ")
  const line1 = str("address1") || str("line1") || str("address")
  const line2 = str("address2") || str("line2") || str("apartment")
  const city = str("city")
  const state = str("state")
  const zip = str("zipCode") || str("zip") || str("postal_code")
  const country = str("country")
  const cityPart = [city, state].filter(Boolean).join(", ")
  const cityZip = [cityPart, zip].filter(Boolean).join(" ")
  const parts = [name, line1, line2, cityZip, country].filter(Boolean)
  return parts.join(", ")
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
      .map((i) => {
        const sizeCell = (i.variant ?? "").trim() || "—"
        return `<tr><td>${escapeHtmlReceipt(i.name)}</td><td style="text-align:center">${escapeHtmlReceipt(String(i.quantity))}</td><td style="text-align:center">${escapeHtmlReceipt(sizeCell)}</td><td style="text-align:right">$${Number(i.price).toFixed(2)}</td></tr>`
      })
      .join("")
    const addressBlock = formatStoreShippingAddressPlain(shippingAddress)

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #003366; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">NC United Store</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hi ${escapeHtmlReceipt(customerName)},</p>
    <p>Thanks for your order. Order number: <strong>${escapeHtmlReceipt(orderNumber)}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead><tr style="border-bottom: 1px solid #e5e7eb;"><th style="text-align: left;">Item</th><th>Qty</th><th>Size</th><th style="text-align: right;">Price</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <p style="margin: 8px 0;">Subtotal: $${Number(subtotal).toFixed(2)}</p>
    ${shipping > 0 ? `<p style="margin: 8px 0;">Shipping: $${Number(shipping).toFixed(2)}</p>` : ""}
    ${tax > 0 ? `<p style="margin: 8px 0;">Tax: $${Number(tax).toFixed(2)}</p>` : ""}
    ${discount > 0 ? `<p style="margin: 8px 0;">Discount: -$${Number(discount).toFixed(2)}</p>` : ""}
    <p style="margin: 16px 0; font-weight: bold;">Total: $${Number(total).toFixed(2)}</p>
    ${
      addressBlock
        ? `<p style="margin: 16px 0;">Shipping to: ${escapeHtmlReceipt(addressBlock)}</p>`
        : `<p style="margin: 16px 0; color: #6b7280; font-size: 14px;">No shipping address was stored on this receipt (common for digital-only orders or when only billing details were collected). If you expected a ship-to address, reply to this email and we&apos;ll help.</p>`
    }
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px;">Questions? Contact <a href="mailto:info@ncwrestlingunited.com" style="color: #003366;">info@ncwrestlingunited.com</a></p>
  </div>
</body>
</html>
    `

    const result = await sendStaffEmail(resend, {
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

    const result = await sendStaffEmail(resend, {
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
    const result = await sendStaffEmail(resend, {
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
    const result = await sendStaffEmail(resend, {
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

/** Admin blast: subject + HTML body (e.g. from markdownToHtml). Uses shared template; logoVariant = "recruitnc" | "nc-united". */
export async function sendAdminBlastEmail(
  to: string,
  subject: string,
  htmlBody: string,
  logoVariant: "recruitnc" | "nc-united" = "recruitnc",
  options?: {
    replyTo?: string
    headers?: Record<string, string>
  }
): Promise<{ success: boolean; error?: string; resendMessageId?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Email service not configured" }
  }
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { buildAdminBlastEmailHtml } = await import("@/lib/admin-blast-email-html")
    const baseUrl = (SITE_URL || "").replace(/\/$/, "")
    const html = buildAdminBlastEmailHtml(subject, htmlBody, baseUrl, logoVariant)
    const result = await sendStaffEmail(resend, {
      from: FROM_BLUE,
      to: [to.trim()],
      subject: subject.trim() || "Update from RecruitNC",
      html,
      ...(options?.replyTo ? { reply_to: options.replyTo } : {}),
      ...(options?.headers && Object.keys(options.headers).length > 0
        ? { headers: options.headers as Record<string, string> }
        : {}),
    })
    if (result.error) {
      console.error("[RecruitNC] Admin blast email error:", result.error)
      return { success: false, error: result.error.message }
    }
    const id = result.data?.id
    return { success: true, ...(typeof id === "string" ? { resendMessageId: id } : {}) }
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

// ============================================================
// ORDER STATUS NOTIFICATION EMAILS (shipped, delivered, etc.)
// ============================================================

export interface OrderStatusEmailParams {
  orderNumber: string
  customerName: string
  customerEmail: string
  status: "shipped" | "delivered" | "processing"
  trackingNumber?: string
  trackingCarrier?: string
  orderUrl?: string
}

/** Send order status update email to customer (shipped, delivered, etc). */
export async function sendOrderStatusEmail(
  params: OrderStatusEmailParams
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping order status email")
    return { success: false, error: "Email service not configured" }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { orderNumber, customerName, customerEmail, status, trackingNumber, trackingCarrier, orderUrl } = params

    const statusConfig: Record<string, { subject: string; heading: string; message: string; color: string; icon: string }> = {
      processing: {
        subject: `Order ${orderNumber} is being prepared`,
        heading: "Your order is being prepared",
        message: "We're getting your items ready for shipment. You'll receive another email with tracking information once it ships.",
        color: "#3B82F6",
        icon: "📦",
      },
      shipped: {
        subject: `Order ${orderNumber} has shipped!`,
        heading: "Your order is on the way!",
        message: "Great news! Your order has been shipped and is heading your way.",
        color: "#8B5CF6",
        icon: "🚚",
      },
      delivered: {
        subject: `Order ${orderNumber} has been delivered`,
        heading: "Your order has been delivered!",
        message: "Your order has arrived. We hope you love it!",
        color: "#10B981",
        icon: "✅",
      },
    }

    const config = statusConfig[status]
    if (!config) {
      return { success: false, error: `Unknown status: ${status}` }
    }

    const trackingUrl = trackingNumber && trackingCarrier
      ? getTrackingUrl(trackingCarrier, trackingNumber)
      : null

    const trackingSection = status === "shipped" && trackingNumber
      ? `
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Tracking Information</p>
        <p style="margin: 0; color: #6b7280;">
          Carrier: <strong>${escapeHtml(trackingCarrier || "Standard")}</strong><br>
          Tracking: <strong>${escapeHtml(trackingNumber)}</strong>
        </p>
        ${trackingUrl ? `
        <p style="margin: 12px 0 0 0;">
          <a href="${escapeHtml(trackingUrl)}" style="display: inline-block; background: ${config.color}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Track Package</a>
        </p>
        ` : ""}
      </div>
      `
      : ""

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #003366; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">NC United Store</h1>
  </div>
  <div style="background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">${config.icon}</span>
      <h2 style="color: #1f2937; margin: 12px 0 0 0;">${config.heading}</h2>
    </div>
    
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>${config.message}</p>
    
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
      <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 18px; color: #1f2937;">${escapeHtml(orderNumber)}</p>
    </div>
    
    ${trackingSection}
    
    ${orderUrl ? `
    <p style="margin: 24px 0; text-align: center;">
      <a href="${escapeHtml(orderUrl)}" style="display: inline-block; background: #003366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
    </p>
    ` : ""}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Questions about your order? Contact us at 
      <a href="mailto:info@ncwrestlingunited.com" style="color: #003366;">info@ncwrestlingunited.com</a>
    </p>
  </div>
</body>
</html>
    `

    const result = await sendStaffEmail(resend, {
      from: FROM_BLUE,
      to: [customerEmail.trim()],
      subject: config.subject,
      html,
    })

    if (result.error) {
      console.error("Resend order status error:", result.error)
      return { success: false, error: result.error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email"
    console.error("sendOrderStatusEmail:", err)
    return { success: false, error: message }
  }
}

/** Generate tracking URL for common carriers */
function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const c = carrier.toLowerCase()
  if (c.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
  }
  if (c.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`
  }
  if (c.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  }
  if (c.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
  }
  return null
}
