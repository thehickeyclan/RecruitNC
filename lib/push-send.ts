import "server-only"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"
const EXPO_RECEIPT_ENDPOINT = "https://exp.host/--/api/v2/push/getReceipts"

/**
 * How long to wait before asking Expo what happened to the tickets we just filed.
 *
 * A ticket only means Expo accepted the message. Whether Apple actually took it shows up in
 * the receipt, which is a separate call and is not ready immediately. Expo suggests waiting
 * ~15 minutes; a request handler cannot, so this is a short look that catches the fast
 * failures and misses the slow ones. That is a real limit, not an oversight — the alternative
 * is storing ticket ids for a later sweep, which needs a table this does not have yet.
 */
const RECEIPT_DELAY_MS = 3_000
/** Expo rejects batches larger than this. */
const CHUNK = 100

export type PushMessage = {
  title: string
  body: string
  data?: Record<string, unknown>
}

type ExpoTicket = {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

type ExpoReceipt = {
  status: "ok" | "error"
  message?: string
  details?: { error?: string }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Sends one message to every device opted into `column`, and prunes tokens Expo reports as
 * DeviceNotRegistered. Without that pruning the table accumulates dead tokens from every
 * uninstall and each send wastes calls on addresses that can never receive again.
 */
export async function sendToSubscribers(
  column: "alert_commits" | "alert_rankings" | "alert_events" | "alert_toc" | "alert_news",
  message: PushMessage,
): Promise<{ sent: number; failed: number; pruned: number; undelivered: number }> {
  const admin = createAdminClient()

  const { data: devices, error } = await admin
    .from("push_devices")
    .select("expo_push_token")
    .eq(column, true)

  if (error) throw new Error(error.message)

  const tokens = (devices ?? []).map((d) => d.expo_push_token).filter(Boolean) as string[]
  const { data: sendRow } = await admin.from("push_notification_sends").insert({
    category: column,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    targeted: tokens.length,
  }).select("id").maybeSingle()
  const sendId = sendRow?.id as string | undefined
  if (tokens.length === 0) {
    if (sendId) await admin.from("push_notification_sends").update({ completed_at: new Date().toISOString() }).eq("id", sendId)
    return { sent: 0, failed: 0, pruned: 0, undelivered: 0 }
  }

  let sent = 0
  let failed = 0
  let undelivered = 0
  const dead: string[] = []
  /** Ticket id → the token it was for, so a bad receipt can name the device that failed. */
  const ticketTokenById = new Map<string, string>()
  const deliveryRows: Array<Record<string, unknown>> = []
  const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex")

  for (const batch of chunk(tokens, CHUNK)) {
    const payload = batch.map((to) => ({
      to,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
    }))

    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      failed += batch.length
      if (sendId) batch.forEach((token) => deliveryRows.push({ send_id: sendId, token_hash: tokenHash(token), status: "ticket_error", error_message: `Expo HTTP ${response.status}` }))
      continue
    }

    const body = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null
    const tickets = body?.data ?? []

    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        sent += 1
        if (ticket.id) ticketTokenById.set(ticket.id, batch[i])
        if (sendId) deliveryRows.push({ send_id: sendId, expo_ticket_id: ticket.id ?? null, token_hash: tokenHash(batch[i]), status: ticket.id ? "receipt_pending" : "accepted" })
        return
      }
      failed += 1
      if (sendId) deliveryRows.push({ send_id: sendId, token_hash: tokenHash(batch[i]), status: "ticket_error", error_code: ticket.details?.error ?? null, error_message: ticket.message ?? null })
      if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[i])
    })
  }

  if (deliveryRows.length > 0) await admin.from("push_notification_deliveries").insert(deliveryRows)

  // Tickets say "accepted", not "delivered". Ask what actually happened before reporting
  // success — sending with no receipt check is how a push reports ok and reaches nobody.
  if (ticketTokenById.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, RECEIPT_DELAY_MS))
    try {
      const receiptRes = await fetch(EXPO_RECEIPT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ids: [...ticketTokenById.keys()] }),
      })
      const receiptBody = (await receiptRes.json().catch(() => null)) as
        | { data?: Record<string, ExpoReceipt> }
        | null

      for (const [id, receipt] of Object.entries(receiptBody?.data ?? {})) {
        if (sendId) await admin.from("push_notification_deliveries").update({
          status: receipt.status === "ok" ? "delivered" : "receipt_error",
          error_code: receipt.details?.error ?? null,
          error_message: receipt.message ?? null,
          updated_at: new Date().toISOString(),
        }).eq("send_id", sendId).eq("expo_ticket_id", id)
        if (receipt.status === "ok") continue
        const token = ticketTokenById.get(id)
        undelivered += 1
        console.warn(
          `[push-send] ${column} receipt ${id}: ${receipt.details?.error ?? "error"} — ${receipt.message ?? ""}`,
        )
        if (token && receipt.details?.error === "DeviceNotRegistered") dead.push(token)
      }
    } catch (e) {
      // A receipt lookup that fails tells us nothing either way; the send still happened.
      console.warn("[push-send] receipt lookup failed:", e instanceof Error ? e.message : e)
    }
  }

  if (dead.length > 0) {
    await admin.from("push_devices").delete().in("expo_push_token", dead)
  }

  if (sendId) {
    const { data: rows } = await admin.from("push_notification_deliveries").select("status").eq("send_id", sendId)
    const delivered = (rows ?? []).filter((row) => row.status === "delivered").length
    const pending = (rows ?? []).filter((row) => row.status === "receipt_pending").length
    await admin.from("push_notification_sends").update({
      accepted: sent,
      failed,
      delivered,
      undelivered,
      pending,
      pruned: dead.length,
      completed_at: new Date().toISOString(),
    }).eq("id", sendId)
  }

  return { sent, failed, pruned: dead.length, undelivered }
}
