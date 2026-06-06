import type { SupabaseClient } from "@supabase/supabase-js"
import { sendAdminBlastEmail } from "@/lib/email"
import { buildReplyToForThread } from "@/lib/recruitnc-admin-email"
import type { AdminMessagingRecipientRow } from "@/lib/admin-messaging-recipients"

export type BlastEmailSendResult = { sent: number; failed: number; skippedNoEmail: number }

type SendOneOpts = {
  admin: SupabaseClient
  recipient: AdminMessagingRecipientRow
  subject: string
  htmlBody: string
  plainBody: string
  logoVariant: "recruitnc" | "nc-united"
  useEmailThreads: boolean
  blastLogId: string | null
  adminUserId: string
  replyDomain: string | null
}

async function sendOneBlastEmail(opts: SendOneOpts): Promise<"sent" | "failed"> {
  const email = opts.recipient.email?.trim()
  if (!email) return "failed"

  if (opts.useEmailThreads && opts.blastLogId && opts.replyDomain && opts.recipient.user_id !== "test") {
    try {
      const { data: thr, error: thrErr } = await opts.admin
        .from("admin_email_threads")
        .insert({
          recipient_user_id: opts.recipient.user_id,
          admin_blast_log_id: opts.blastLogId,
          subject: opts.subject,
          created_by_admin_id: opts.adminUserId,
        })
        .select("id")
        .single()

      if (!thrErr && thr?.id) {
        const ok = await sendAdminBlastEmail(email, opts.subject, opts.htmlBody, opts.logoVariant, {
          replyTo: buildReplyToForThread(thr.id, opts.replyDomain),
          headers: { "X-RecruitNC-Email-Thread-Id": thr.id },
        })
        if (ok.success) {
          await opts.admin.from("admin_email_messages").insert({
            thread_id: thr.id,
            direction: "outbound",
            body_text: opts.plainBody.slice(0, 100_000),
            resend_sent_message_id: ok.resendMessageId ?? null,
          })
          return "sent"
        }
        return "failed"
      }
    } catch (e) {
      console.warn("[admin-messaging-blast-email] threaded:", (e as Error).message)
    }
  }

  const ok = await sendAdminBlastEmail(email, opts.subject, opts.htmlBody, opts.logoVariant)
  return ok.success ? "sent" : "failed"
}

/** Parallel Resend sends — sequential 700+ calls hit Vercel timeout and never reach Resend. */
export async function sendAdminBlastEmails(
  recipients: AdminMessagingRecipientRow[],
  opts: Omit<SendOneOpts, "recipient"> & { concurrency?: number },
): Promise<BlastEmailSendResult> {
  const concurrency = Math.min(Math.max(opts.concurrency ?? 12, 1), 25)
  const withEmail = recipients.filter((r) => r.email?.trim())
  const skippedNoEmail = recipients.length - withEmail.length

  let sent = 0
  let failed = 0

  for (let i = 0; i < withEmail.length; i += concurrency) {
    const batch = withEmail.slice(i, i + concurrency)
    const outcomes = await Promise.all(
      batch.map((recipient) => sendOneBlastEmail({ ...opts, recipient })),
    )
    for (const o of outcomes) {
      if (o === "sent") sent++
      else failed++
    }
  }

  return { sent, failed, skippedNoEmail }
}
