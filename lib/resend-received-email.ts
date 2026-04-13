/**
 * Fetch full content for a received email (webhook only sends metadata).
 * GET https://api.resend.com/emails/receiving/:id
 */

export type ResendReceivedEmail = {
  id: string
  to?: string[] | string
  from?: string
  subject?: string | null
  html?: string | null
  text?: string | null
  headers?: Record<string, string>
}

export async function fetchResendReceivedEmail(emailId: string): Promise<ResendReceivedEmail | null> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.error("[resend-received-email] RESEND_API_KEY missing")
    return null
  }
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("[resend-received-email]", res.status, await res.text())
      return null
    }
    return (await res.json()) as ResendReceivedEmail
  } catch (e) {
    console.error("[resend-received-email]", e)
    return null
  }
}
