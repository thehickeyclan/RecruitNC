/** Reply-To for admin blast emails: replies+<thread_uuid>@RECRUITNC_EMAIL_REPLY_DOMAIN */

export function getRecruitNcEmailReplyDomain(): string | null {
  const d = process.env.RECRUITNC_EMAIL_REPLY_DOMAIN?.trim()
  return d || null
}

export function buildReplyToForThread(threadId: string, domain: string): string {
  const local = `replies+${threadId}`
  return `${local}@${domain.replace(/^@/, "")}`
}

/** Extract thread UUID from an inbound To: address (e.g. replies+uuid@domain). */
export function parseThreadIdFromAddress(toRaw: string): string | null {
  const s = toRaw.trim()
  const bracket = /<([^>]+)>/.exec(s)
  const addr = bracket ? bracket[1] : s
  const m = /^replies\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@/i.exec(addr.trim())
  return m?.[1] ?? null
}

/** Parse "Name <email@x.com>" or email@x.com */
export function parseEmailAddress(fromRaw: string): { email: string; name: string | null } {
  const s = fromRaw.trim()
  const m = /<([^>]+)>/.exec(s)
  if (m) {
    const email = m[1].trim().toLowerCase()
    const namePart = s.slice(0, m.index).trim().replace(/^"|"$/g, "")
    return { email, name: namePart || null }
  }
  return { email: s.toLowerCase(), name: null }
}
