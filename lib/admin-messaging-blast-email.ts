import { buildAdminBlastEmailHtml } from "@/lib/admin-blast-email-html"
import type { AdminBlastSender } from "@/lib/admin-blast-senders"
import { sendAdminBlastEmail } from "@/lib/email"
import type { AdminMessagingRecipientRow } from "@/lib/admin-messaging-recipients"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  filterUnsubscribed,
  unsubscribeFooterHtml,
  unsubscribeHeaders,
  unsubscribeUrl,
} from "@/lib/email-unsubscribe"

export type BlastEmailSendResult = {
  sent: number
  failed: number
  skippedNoEmail: number
  /** Addresses that asked not to hear from us. Reported so a send is never silently short. */
  skippedUnsubscribed: number
  /** Reserved/test-domain addresses (example.com, *.test, ...) left out before sending. */
  skippedTestAddress: number
  sampleError?: string
}

const RESEND_BATCH_MAX = 100
/** Above this count, use Resend batch API + pacing (avoids 429 from concurrent singles). */
const BULK_BATCH_THRESHOLD = 15
const DELAY_BETWEEN_BATCHES_MS = 1200

/** Second-level domains reserved for documentation (RFC 2606); any subdomain counts too. */
const RESERVED_DOMAINS = ["example.com", "example.org", "example.net"]
/** Top-level domains that can never receive mail (RFC 2606 / 6761 / 6762). */
const RESERVED_TLDS = ["test", "invalid", "local", "example", "localhost"]

/**
 * True for addresses at reserved or test domains. Resend rejects a whole batch if any one
 * address is at one of these, so they must never reach a batch: on 4 Nov 2026 the QA account
 * qa-family.recruitnc@example.com sank 99 real recipients in its chunk of 100.
 */
export function isReservedTestAddress(email: string): boolean {
  const at = email.trim().lastIndexOf("@")
  if (at < 0) return false
  const domain = email.trim().slice(at + 1).toLowerCase().replace(/\.$/, "")
  if (!domain) return false
  if (RESERVED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return true
  const tld = domain.split(".").pop()!
  return RESERVED_TLDS.includes(tld)
}

function isRateLimitError(msg: string): boolean {
  return /rate|429|too many/i.test(msg)
}

/** Resend's "this request is malformed" errors (bad address, missing field) - not transient. */
function isValidationError(err: { name?: string; message?: string }): boolean {
  const text = `${err.name ?? ""} ${err.message ?? ""}`
  return !isRateLimitError(text) && /validation|invalid|missing_required/i.test(text)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendSingleWithInnerHtml(to: string, subject: string, innerHtmlBody: string, sender: AdminBlastSender, replyTo?: string, extra?: { footerHtml: string; headers: Record<string, string> }): Promise<{ ok: boolean; error?: string }> {
  const ok = await sendAdminBlastEmail(to, subject, innerHtmlBody + (extra?.footerHtml ?? ""), sender.logoVariant, {
    from: sender.from,
    footer: sender.footer,
    replyTo,
    ...(extra?.headers ? { headers: extra.headers } : {}),
  })
  return { ok: ok.success, error: ok.error }
}

function countBatchSuccessIds(data: unknown, batchSize: number): number {
  if (!data) return batchSize
  const rows = Array.isArray(data) ? data : typeof data === "object" && data !== null && "data" in data && Array.isArray((data as { data: unknown }).data) ? (data as { data: unknown[] }).data : null
  if (!rows) return batchSize
  const withId = rows.filter((r) => r && typeof r === "object" && "id" in r && (r as { id?: string }).id)
  return withId.length > 0 ? withId.length : batchSize
}

type ResendClient = InstanceType<typeof import("resend").Resend>
type BatchPayload = Parameters<ResendClient["batch"]["send"]>[0]

const DELAY_BETWEEN_SINGLES_MS = 550

/** Fallback for a rejected batch: each message on its own, paced, retrying rate limits. */
async function sendPayloadsOneByOne(resend: ResendClient, payload: BatchPayload): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (let i = 0; i < payload.length; i++) {
    let done = false
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      let msg: string | undefined
      try {
        const result = await resend.emails.send(payload[i]!)
        if (!result.error) {
          sent++
          done = true
          break
        }
        msg = result.error.message ?? String(result.error)
      } catch (e) {
        msg = e instanceof Error ? e.message : "send failed"
      }
      if (isRateLimitError(msg) && attempt < 3) {
        await sleep(2000 * attempt)
        continue
      }
      console.warn(`[admin-blast] single send failed for ${payload[i]!.to}: ${msg}`)
      failed++
      done = true
    }
    if (i < payload.length - 1) await sleep(DELAY_BETWEEN_SINGLES_MS)
  }
  return { sent, failed }
}

async function sendBatchViaResend(emails: string[], subject: string, htmlFor: (email: string) => string, headersFor: (email: string) => Record<string, string>, from: string, replyTo?: string): Promise<{ sent: number; failed: number; sampleError?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return {
      sent: 0,
      failed: emails.length,
      sampleError: "RESEND_API_KEY not configured",
    }
  }

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0
  let sampleError: string | undefined
  const parts = chunk(emails, RESEND_BATCH_MAX)

  for (let bi = 0; bi < parts.length; bi++) {
    const part = parts[bi]!
    /*
     * Built per recipient, because the unsubscribe link is per recipient. The batch API takes
     * a distinct message for each address, so honouring one-click costs nothing in throughput.
     */
    const payload = part.map((to) => ({
      from,
      to: [to.trim()],
      subject: subject.trim() || "Update from RecruitNC",
      html: htmlFor(to.trim()),
      headers: headersFor(to.trim()),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }))

    let attempt = 0
    let batchDone = false
    while (attempt < 3 && !batchDone) {
      attempt++
      try {
        const result = await resend.batch.send(payload)
        if (result.error) {
          const msg = result.error.message ?? String(result.error)
          sampleError = sampleError ?? msg
          if (isRateLimitError(msg) && attempt < 3) {
            await sleep(2000 * attempt)
            continue
          }
          if (isValidationError(result.error)) {
            /*
             * Resend validates the whole batch and rejects it whole, so one bad address fails
             * every recipient in the chunk. Send this chunk one at a time instead, so only the
             * bad address fails.
             */
            const singles = await sendPayloadsOneByOne(resend, payload)
            sent += singles.sent
            failed += singles.failed
            batchDone = true
            continue
          }
          failed += part.length
          batchDone = true
          continue
        }
        const n = countBatchSuccessIds(result.data, part.length)
        sent += n
        failed += Math.max(0, part.length - n)
        batchDone = true
      } catch (e) {
        const msg = e instanceof Error ? e.message : "batch send failed"
        sampleError = sampleError ?? msg
        if (isRateLimitError(msg) && attempt < 3) {
          await sleep(2000 * attempt)
          continue
        }
        failed += part.length
        batchDone = true
      }
    }

    if (bi < parts.length - 1) await sleep(DELAY_BETWEEN_BATCHES_MS)
  }

  return { sent, failed, sampleError }
}

/** Small audiences: paced singles (tests, tiny groups). */
async function sendSinglesPaced(recipients: AdminMessagingRecipientRow[], subject: string, innerHtmlBody: string, sender: AdminBlastSender, baseUrl: string, replyTo?: string): Promise<{ sent: number; failed: number; sampleError?: string }> {
  let sent = 0
  let failed = 0
  let sampleError: string | undefined
  const concurrency = 2

  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency)
    const outcomes = await Promise.all(
      batch.map(async (r) => {
        const email = r.email?.trim()
        if (!email) return { ok: false as const, error: "no email" }
        const url = unsubscribeUrl(baseUrl, email)
        return sendSingleWithInnerHtml(email, subject, innerHtmlBody, sender, replyTo, {
          footerHtml: unsubscribeFooterHtml(url),
          headers: unsubscribeHeaders(url),
        })
      }),
    )
    for (const o of outcomes) {
      if (o.ok) sent++
      else {
        failed++
        if (o.error) sampleError = sampleError ?? o.error
      }
    }
    if (i + concurrency < recipients.length) await sleep(400)
  }

  return { sent, failed, sampleError }
}

/** Drops rows with no address, then rows at reserved/test domains, counting each. */
function splitRecipients(recipients: AdminMessagingRecipientRow[]) {
  const withAny = recipients.filter((r) => r.email?.trim())
  const withEmail = withAny.filter((r) => !isReservedTestAddress(r.email!))
  return {
    withEmail,
    skippedNoEmail: recipients.length - withAny.length,
    skippedTestAddress: withAny.length - withEmail.length,
  }
}

/**
 * Large lists use Resend `batch.send` (100/call, paced). Runs synchronously in one request until done.
 */
export async function sendAdminBlastEmails(
  recipients: AdminMessagingRecipientRow[],
  opts: {
    subject: string
    htmlBody: string
    sender: AdminBlastSender
    replyTo?: string
  },
): Promise<BlastEmailSendResult> {
  const { withEmail, skippedNoEmail, skippedTestAddress } = splitRecipients(recipients)
  if (withEmail.length === 0) {
    return { sent: 0, failed: 0, skippedNoEmail, skippedUnsubscribed: 0, skippedTestAddress }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com").replace(/\/$/, "")

  /*
   * The suppression list is applied here, at the one place every blast goes through, rather
   * than at each call site. An opt-out that only some senders consult is not an opt-out.
   */
  const admin = createAdminClient()
  const { allowed: allowedEmails, suppressed } = await filterUnsubscribed(
    admin,
    withEmail.map((r) => r.email!.trim()),
  )
  const allowedSet = new Set(allowedEmails.map((e) => e.toLowerCase()))
  const sendTo = withEmail.filter((r) => allowedSet.has(r.email!.trim().toLowerCase()))
  if (sendTo.length === 0) {
    return { sent: 0, failed: 0, skippedNoEmail, skippedUnsubscribed: suppressed.length, skippedTestAddress }
  }

  const htmlFor = (email: string) =>
    buildAdminBlastEmailHtml(
      opts.subject,
      opts.htmlBody + unsubscribeFooterHtml(unsubscribeUrl(baseUrl, email)),
      baseUrl,
      opts.sender.logoVariant,
      opts.sender.footer,
    )
  const headersFor = (email: string) => unsubscribeHeaders(unsubscribeUrl(baseUrl, email))
  const emails = sendTo.map((r) => r.email!.trim())

  const result = sendTo.length >= BULK_BATCH_THRESHOLD
    ? await sendBatchViaResend(emails, opts.subject, htmlFor, headersFor, opts.sender.from, opts.replyTo)
    : await sendSinglesPaced(sendTo, opts.subject, opts.htmlBody, opts.sender, baseUrl, opts.replyTo)

  return {
    sent: result.sent,
    failed: result.failed,
    skippedNoEmail,
    skippedUnsubscribed: suppressed.length,
    skippedTestAddress,
    sampleError: result.sampleError,
  }
}

/** Resend counts to + cc + bcc together, 50 at most per email; one slot goes to the To line. */
const BCC_PER_EMAIL = 49

/** "NC United <info@x.com>" -> "info@x.com". */
function addressOf(from: string): string {
  return from.match(/<([^>]+)>/)?.[1]?.trim() ?? from.trim()
}

/**
 * One message with everyone blind-copied (Matt: "to all on bcc"), sent in groups of 49 because
 * that is Resend's ceiling per email. The To line is our own sending address, so no recipient
 * sees another's.
 *
 * What it costs, and why individual sends stay the default: a shared message cannot carry a
 * per-recipient one-click unsubscribe link, so the footer asks for a reply instead - and the
 * suppression list still applies, so anyone already unsubscribed is left out.
 */
export async function sendAdminBccEmails(
  recipients: AdminMessagingRecipientRow[],
  opts: { subject: string; htmlBody: string; sender: AdminBlastSender; replyTo?: string },
): Promise<BlastEmailSendResult> {
  const { withEmail, skippedNoEmail, skippedTestAddress } = splitRecipients(recipients)
  if (!withEmail.length) return { sent: 0, failed: 0, skippedNoEmail, skippedUnsubscribed: 0, skippedTestAddress }
  if (!process.env.RESEND_API_KEY) {
    return { sent: 0, failed: withEmail.length, skippedNoEmail, skippedUnsubscribed: 0, skippedTestAddress, sampleError: "RESEND_API_KEY not configured" }
  }

  const admin = createAdminClient()
  const { allowed, suppressed } = await filterUnsubscribed(admin, withEmail.map((r) => r.email!.trim()))
  const emails = [...new Set(allowed.map((e) => e.trim().toLowerCase()))]
  if (!emails.length) return { sent: 0, failed: 0, skippedNoEmail, skippedUnsubscribed: suppressed.length, skippedTestAddress }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com").replace(/\/$/, "")
  const footer =
    '<p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5">' +
    "You are receiving this as a college wrestling coach. To stop receiving these emails, reply with “unsubscribe”." +
    "</p>"
  const html = buildAdminBlastEmailHtml(opts.subject, opts.htmlBody + footer, baseUrl, opts.sender.logoVariant, opts.sender.footer)
  const to = addressOf(opts.sender.from)

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0
  let sampleError: string | undefined
  const parts = chunk(emails, BCC_PER_EMAIL)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    let done = false
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const result = await resend.emails.send({
          from: opts.sender.from,
          to: [to],
          bcc: part,
          subject: opts.subject.trim() || "Update from RecruitNC",
          html,
          ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        })
        if (result.error) {
          const msg = result.error.message ?? String(result.error)
          sampleError ??= msg
          if (/rate|429|too many/i.test(msg) && attempt < 3) {
            await sleep(2000 * attempt)
            continue
          }
          failed += part.length
        } else {
          sent += part.length
        }
        done = true
      } catch (e) {
        const msg = e instanceof Error ? e.message : "send failed"
        sampleError ??= msg
        if (/rate|429|too many/i.test(msg) && attempt < 3) {
          await sleep(2000 * attempt)
          continue
        }
        failed += part.length
        done = true
      }
    }
    if (i < parts.length - 1) await sleep(600)
  }
  return { sent, failed, skippedNoEmail, skippedUnsubscribed: suppressed.length, skippedTestAddress, sampleError }
}
