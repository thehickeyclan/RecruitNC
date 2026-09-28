import "server-only"

import { createHmac, timingSafeEqual } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Opting out of bulk email, without an account.
 *
 * Every blast the admin tool sent went out with no unsubscribe of any kind: no link in the
 * footer, no `List-Unsubscribe` header, and no page to land on. The only opt-out machinery in
 * the codebase belonged to the separate TOC list. That is a CAN-SPAM problem on any message
 * that sells something — the rankings announcement does — and Gmail and Yahoo both now require
 * one-click unsubscribe from bulk senders, so the practical cost is that recipients reach for
 * "spam" instead, which is what actually ruins a sending domain.
 *
 * The token is an HMAC of the address rather than a row handed out in advance: an unsubscribe
 * link has to work for somebody who never had an account, whose row may since have been
 * deleted, and who is clicking from a mail client that will not carry a session. Deriving it
 * means any address can be verified on arrival, and nothing needs storing until they act.
 */

const SECRET =
  process.env.EMAIL_UNSUBSCRIBE_SECRET ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ""

export const UNSUBSCRIBE_TABLE = "email_unsubscribes"

/** Lower-cased and trimmed, so a capitalised address cannot opt out twice. */
export function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase()
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", SECRET).update(normalizeEmail(email)).digest("hex").slice(0, 32)
}

/** Constant-time, so the endpoint cannot be used to probe for valid tokens. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!SECRET) return false
  const expected = Buffer.from(unsubscribeToken(email))
  const given = Buffer.from(String(token ?? ""))
  if (expected.length !== given.length) return false
  return timingSafeEqual(expected, given)
}

export function unsubscribeUrl(baseUrl: string, email: string): string {
  const base = String(baseUrl ?? "").replace(/\/$/, "")
  const e = encodeURIComponent(normalizeEmail(email))
  return `${base}/unsubscribe?e=${e}&t=${unsubscribeToken(email)}`
}

/**
 * Record the opt-out. Idempotent: clicking twice is not an error, and a second click from a
 * forwarded copy of the same mail must not fail in front of somebody trying to leave.
 */
export async function recordUnsubscribe(
  admin: SupabaseClient,
  email: string,
  source = "email_link",
): Promise<{ ok: boolean; error?: string }> {
  const address = normalizeEmail(email)
  if (!address) return { ok: false, error: "No address" }
  const { error } = await admin
    .from(UNSUBSCRIBE_TABLE)
    .upsert({ email: address, source, unsubscribed_at: new Date().toISOString() }, { onConflict: "email" })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function isUnsubscribed(admin: SupabaseClient, email: string): Promise<boolean> {
  const address = normalizeEmail(email)
  if (!address) return false
  const { data } = await admin.from(UNSUBSCRIBE_TABLE).select("email").eq("email", address).maybeSingle()
  return Boolean(data)
}

/**
 * Filter a send list. One query rather than one per address, because a blast is a thousand
 * of them and a suppression list that times out is a suppression list nobody applies.
 */
export async function filterUnsubscribed(
  admin: SupabaseClient,
  emails: string[],
): Promise<{ allowed: string[]; suppressed: string[] }> {
  const wanted = [...new Set(emails.map(normalizeEmail).filter(Boolean))]
  if (wanted.length === 0) return { allowed: [], suppressed: [] }

  const suppressedSet = new Set<string>()
  // Chunked: `in()` builds a URL, and a thousand addresses is longer than one may be.
  for (let i = 0; i < wanted.length; i += 200) {
    const { data } = await admin
      .from(UNSUBSCRIBE_TABLE)
      .select("email")
      .in("email", wanted.slice(i, i + 200))
    for (const row of data ?? []) suppressedSet.add(normalizeEmail((row as { email: string }).email))
  }

  const allowed: string[] = []
  const suppressed: string[] = []
  for (const original of emails) {
    if (suppressedSet.has(normalizeEmail(original))) suppressed.push(original)
    else allowed.push(original)
  }
  return { allowed, suppressed }
}

/** The footer every bulk message carries, and the headers Gmail reads for one-click. */
export function unsubscribeFooterHtml(url: string): string {
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
  <p style="margin:0 0 6px;">NC Wrestling United · Apex, North Carolina</p>
  <p style="margin:0;">Don't want these emails? <a href="${url}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>.</p>
</div>`
}

export function unsubscribeHeaders(url: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${url}>`,
    // Tells Gmail/Yahoo the link is safe to POST, which is what makes the native button appear.
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}
