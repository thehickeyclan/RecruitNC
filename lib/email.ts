/**
 * Email utility for sending transactional emails
 * Uses Resend for email delivery
 */

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
      from: "NC Wrestling United <info@ncwrestlingunited.com>",
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

