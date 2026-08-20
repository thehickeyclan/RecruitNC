import { createAdminClient } from "@/lib/supabase/admin"

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"
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
  column: "alert_commits" | "alert_rankings" | "alert_events" | "alert_toc",
  message: PushMessage,
): Promise<{ sent: number; failed: number; pruned: number }> {
  const admin = createAdminClient()

  const { data: devices, error } = await admin
    .from("push_devices")
    .select("expo_push_token")
    .eq(column, true)

  if (error) throw new Error(error.message)

  const tokens = (devices ?? []).map((d) => d.expo_push_token).filter(Boolean) as string[]
  if (tokens.length === 0) return { sent: 0, failed: 0, pruned: 0 }

  let sent = 0
  let failed = 0
  const dead: string[] = []

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
      continue
    }

    const body = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null
    const tickets = body?.data ?? []

    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        sent += 1
        return
      }
      failed += 1
      if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[i])
    })
  }

  if (dead.length > 0) {
    await admin.from("push_devices").delete().in("expo_push_token", dead)
  }

  return { sent, failed, pruned: dead.length }
}
