/** Staff inbox copied on outbound user-facing mail (override via NC_UNITED_STAFF_BCC). */
export const NC_UNITED_STAFF_BCC =
  process.env.NC_UNITED_STAFF_BCC?.trim() || "info@ncwrestlingunited.com"

export type ResendEmailPayload = {
  from: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  bcc?: string | string[]
  cc?: string | string[]
  replyTo?: string
  reply_to?: string
  headers?: Record<string, string>
}

function extractEmail(addr: string): string {
  const trimmed = addr.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match ? match[1] : trimmed).toLowerCase()
}

function normalizeList(value: string | string[] | undefined): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).map(extractEmail).filter(Boolean)
}

/** Add info@ (staff BCC) unless the message is already addressed only to that inbox. */
export function withStaffBcc<T extends ResendEmailPayload>(payload: T): T {
  const staff = extractEmail(NC_UNITED_STAFF_BCC)
  const recipients = [...normalizeList(payload.to), ...normalizeList(payload.cc)]
  const existingBcc = normalizeList(payload.bcc)

  if (recipients.length > 0 && recipients.every((e) => e === staff)) {
    return payload
  }
  if (existingBcc.includes(staff)) {
    return payload
  }

  const bcc = [...(Array.isArray(payload.bcc) ? payload.bcc : payload.bcc ? [payload.bcc] : []), NC_UNITED_STAFF_BCC]
  return { ...payload, bcc }
}

type ResendClient = {
  emails: {
    send: (payload: ResendEmailPayload) => Promise<{ error?: { message: string }; data?: { id?: string } }>
  }
}

/** Resend send with staff BCC applied. */
export async function sendStaffEmail(resend: ResendClient, payload: ResendEmailPayload) {
  return resend.emails.send(withStaffBcc(payload))
}
