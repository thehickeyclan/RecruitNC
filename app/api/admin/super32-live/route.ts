/**
 * Super 32 Command Center admin: upload seeds and Flo exports, publish snapshots, send alerts.
 *
 * Every statewide alert is sent by Matt from the admin page, one tap each; nothing sends on its
 * own. Sends are also gated by SUPER32_LIVE_PUSH=1 and capped at one per 20 minutes.
 * A test goes to the signed-in admin's own phones only, so it works before push is switched on.
 */
import { NextResponse, type NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { sendToSubscribers, sendToTokens } from "@/lib/push-send"
import { buildSnapshot, latestSnapshot, latestUpload, parseSeedsCsv, SUPER32_EVENT_KEY, type SnapshotData } from "@/lib/super32-live/snapshot"
import { syncResults } from "@/lib/super32-live/sync"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const CAP_MINUTES = 20

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = createAdminClient()
  const me = await currentUserId()
  const [snap, published, uploads, alerts, audience, mine, viewing, views] = await Promise.all([
    latestSnapshot(admin),
    // Only the id is needed to tell whether the latest build is published; the full snapshot is heavy.
    admin.from("super32_live_snapshots").select("id").eq("event_key", SUPER32_EVENT_KEY).eq("published", true).order("created_at", { ascending: false }).limit(1).maybeSingle().then((r) => r.data),
    admin.from("super32_live_uploads").select("id, kind, file_name, seeds_final, created_at").eq("event_key", SUPER32_EVENT_KEY).order("created_at", { ascending: false }).limit(30),
    admin.from("super32_live_alerts").select("*").eq("event_key", SUPER32_EVENT_KEY).order("created_at", { ascending: false }).limit(200),
    admin.from("push_devices").select("expo_push_token", { count: "exact", head: true }).eq("alert_results", true),
    me ? admin.from("push_devices").select("expo_push_token", { count: "exact", head: true }).eq("user_id", me) : Promise.resolve({ count: 0 }),
    // Same 2-minute window the page's check-ins use.
    admin.from("super32_live_presence").select("session_id", { count: "exact", head: true }).gte("last_seen", new Date(Date.now() - 120_000).toISOString()),
    admin.from("super32_live_views").select("id", { count: "exact", head: true }),
  ])
  return NextResponse.json({
    snapshot: snap,
    publishedId: published?.id ?? null,
    uploads: uploads.data ?? [],
    alerts: alerts.data ?? [],
    pushEnabled: process.env.SUPER32_LIVE_PUSH === "1",
    audience: audience.count ?? null,
    myDevices: mine.count ?? 0,
    capMinutes: CAP_MINUTES,
    viewing: viewing.count ?? 0,
    views: views.count ?? 0,
  })
}

type Body =
  | { action: "upload"; kind: "flo" | "seeds"; fileName?: string; content: string; seedsFinal?: boolean }
  | { action: "rebuild" }
  | { action: "publish"; snapshotId: string }
  | { action: "send"; alertId: string; override?: boolean }
  | { action: "dismiss" | "hold" | "restore"; alertId: string }
  | { action: "custom"; title: string; body: string; override?: boolean }
  | { action: "test"; title: string; body: string }

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = (await request.json().catch(() => null)) as Body | null
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 })
  const admin = createAdminClient()

  if (body.action === "upload" || body.action === "rebuild") {
    if (body.action === "upload") {
      if (!body.content?.trim()) return NextResponse.json({ error: "Empty file" }, { status: 400 })
      if (/^PK/.test(body.content)) return NextResponse.json({ error: "That is an .xlsx file. Open it and save as CSV, then upload the CSV." }, { status: 400 })
      const { error } = await admin.from("super32_live_uploads").insert({
        event_key: SUPER32_EVENT_KEY, kind: body.kind, file_name: body.fileName ?? null,
        content: body.content, seeds_final: body.kind === "seeds" ? !!body.seedsFinal : false,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    try {
      const snap = await buildSnapshot(admin)
      return NextResponse.json({ ok: true, snapshotId: snap.id, alertsQueued: snap.alertsQueued })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  if (body.action === "publish") {
    await admin.from("super32_live_snapshots").update({ published: false }).eq("event_key", SUPER32_EVENT_KEY).eq("published", true)
    const { error } = await admin.from("super32_live_snapshots").update({ published: true, published_at: new Date().toISOString() }).eq("id", body.snapshotId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    revalidateTag("super32-live")
    // Profiles, rankings and the coach reports read the published results from the usual tables.
    const [flo, seedsUp, snap] = await Promise.all([
      latestUpload(admin, SUPER32_EVENT_KEY, "flo"),
      latestUpload(admin, SUPER32_EVENT_KEY, "seeds"),
      admin.from("super32_live_snapshots").select("data").eq("id", body.snapshotId).single(),
    ])
    if (!flo || !snap.data) return NextResponse.json({ ok: true, synced: null })
    try {
      const synced = await syncResults(admin, SUPER32_EVENT_KEY, flo.content, seedsUp ? parseSeedsCsv(seedsUp.content) : [], snap.data.data as SnapshotData)
      return NextResponse.json({ ok: true, synced })
    } catch (e) {
      return NextResponse.json({ ok: true, synced: null, syncError: e instanceof Error ? e.message : String(e) })
    }
  }

  if (body.action === "dismiss" || body.action === "hold" || body.action === "restore") {
    const status = body.action === "dismiss" ? "dismissed" : body.action === "hold" ? "held" : "pending"
    await admin.from("super32_live_alerts").update({ status }).eq("id", body.alertId).neq("status", "sent")
    return NextResponse.json({ ok: true })
  }

  if (body.action === "test") {
    const title = body.title?.trim(), text = body.body?.trim()
    if (!title || !text) return NextResponse.json({ error: "A test needs a title and a message." }, { status: 400 })
    const me = await currentUserId()
    const { data: devices } = me ? await admin.from("push_devices").select("expo_push_token").eq("user_id", me) : { data: [] }
    const tokens = (devices ?? []).map((d: { expo_push_token: string }) => d.expo_push_token).filter(Boolean)
    if (!tokens.length) return NextResponse.json({ error: "No phone is registered to your account. Open the NC United app signed in as you, allow notifications, then try again." }, { status: 409 })
    const r = await sendToTokens("alert_results", tokens, { title, body: text, data: { kind: "super32-live", path: "/news/super32-live" } })
    await admin.from("super32_live_alerts").insert({ event_key: SUPER32_EVENT_KEY, dedupe_key: `test:${crypto.randomUUID()}`, kind: "test", title, body: text, status: "sent", sent_at: new Date().toISOString(), sent_count: r.sent })
    return NextResponse.json({ ok: true, sent: r.sent, failed: r.failed })
  }

  let alertId: string | null = null
  if (body.action === "custom") {
    const title = body.title?.trim(), text = body.body?.trim()
    if (!title || !text) return NextResponse.json({ error: "An alert needs a title and a message." }, { status: 400 })
    if (process.env.SUPER32_LIVE_PUSH !== "1") return NextResponse.json({ error: "Push is off (SUPER32_LIVE_PUSH is not 1)." }, { status: 409 })
    const { data: row, error } = await admin.from("super32_live_alerts")
      .insert({ event_key: SUPER32_EVENT_KEY, dedupe_key: `custom:${crypto.randomUUID()}`, kind: "custom", title, body: text, status: "pending" })
      .select("id").single()
    if (error || !row) return NextResponse.json({ error: error?.message ?? "Could not save the alert" }, { status: 500 })
    alertId = row.id
  } else if (body.action === "send") {
    alertId = body.alertId
  }

  if (alertId && (body.action === "send" || body.action === "custom")) {
    if (process.env.SUPER32_LIVE_PUSH !== "1") return NextResponse.json({ error: "Push is off (SUPER32_LIVE_PUSH is not 1)." }, { status: 409 })
    const { data: alert } = await admin.from("super32_live_alerts").select("*").eq("id", alertId).single()
    if (!alert) return NextResponse.json({ error: "No such alert" }, { status: 404 })
    if (alert.status === "sent") return NextResponse.json({ error: "Already sent" }, { status: 409 })
    if (!body.override) {
      const since = new Date(Date.now() - CAP_MINUTES * 60_000).toISOString()
      const { data: recent } = await admin.from("super32_live_alerts").select("sent_at").eq("event_key", SUPER32_EVENT_KEY).eq("status", "sent").neq("kind", "test").gte("sent_at", since).limit(1)
      if (recent?.length) {
        // A custom alert that cannot go yet waits in the queue instead of vanishing.
        return NextResponse.json({ error: `An alert went out in the last ${CAP_MINUTES} minutes. It is waiting in the queue; send it later or override.`, queued: body.action === "custom" }, { status: 409 })
      }
    }
    // Claim it first so a double tap cannot send twice.
    const { data: claimed } = await admin.from("super32_live_alerts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", alert.id).neq("status", "sent").select("id")
    if (!claimed?.length) return NextResponse.json({ error: "Already sent" }, { status: 409 })
    try {
      const r = await sendToSubscribers("alert_results", { title: alert.title, body: alert.body, data: { kind: "super32-live", path: alert.path } })
      await admin.from("super32_live_alerts").update({ sent_count: r.sent }).eq("id", alert.id)
      return NextResponse.json({ ok: true, sent: r.sent, failed: r.failed })
    } catch (e) {
      await admin.from("super32_live_alerts").update({ status: "pending", sent_at: null }).eq("id", alert.id)
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
