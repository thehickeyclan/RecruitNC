/**
 * Every few minutes during Super 32: pull Flo's results feed, and when it changed, upload, build
 * and publish exactly as the admin page would. Huge and Big win alerts then go out on their own
 * (Matt, 24 Oct); every other alert waits in the admin queue.
 * A build that would lose NC bouts against the published one is left unpublished for a look.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchFloResultsCsv } from "./flo-feed"
import { buildSnapshot, latestSnapshot, latestUpload, parseSeedsCsv, SUPER32_EVENT_KEY, type SnapshotData } from "./snapshot"
import { syncResults } from "./sync"
import { sendToSubscribers } from "@/lib/push-send"

/** Fri 24 Oct 7am ET to Sun 26 Oct 1am ET: the job does nothing outside the event. */
export function pullWindowOpen(now = new Date()): boolean {
  return now >= new Date("2026-10-24T11:00:00Z") && now < new Date("2026-10-26T05:00:00Z")
}

const ncBouts = (d: SnapshotData | null | undefined) =>
  (d?.entrants ?? []).reduce((n, e) => n + e.bouts.filter((b) => b.winType !== "BYE").length, 0)

export async function pullAndPublish(admin: SupabaseClient) {
  const feed = await fetchFloResultsCsv()
  if (feed.bouts === 0) return { status: "empty feed" as const }
  const last = await latestUpload(admin, SUPER32_EVENT_KEY, "flo")
  if (last?.content === feed.csv) return { status: "unchanged" as const, bouts: feed.bouts }

  const published = await latestSnapshot(admin, SUPER32_EVENT_KEY, true)
  const ins = await admin.from("super32_live_uploads").insert({ event_key: SUPER32_EVENT_KEY, kind: "flo", file_name: `flo-feed ${new Date().toISOString()}`, content: feed.csv, seeds_final: false })
  if (ins.error) throw new Error(ins.error.message)
  const snap = await buildSnapshot(admin)
  const before = ncBouts(published?.data as SnapshotData | undefined)
  const after = ncBouts(snap.data)
  if (after < before) return { status: "held" as const, reason: `NC bouts fell from ${before} to ${after}`, snapshotId: snap.id }

  await admin.from("super32_live_snapshots").update({ published: false }).eq("event_key", SUPER32_EVENT_KEY).eq("published", true)
  const up = await admin.from("super32_live_snapshots").update({ published: true, published_at: new Date().toISOString() }).eq("id", snap.id)
  if (up.error) throw new Error(up.error.message)
  const seedsUp = await latestUpload(admin, SUPER32_EVENT_KEY, "seeds")
  // Profiles are not rewritten on every pull: each sync deleted and re-inserted ~4,000 bout rows,
  // which threw away the result links profiles read through and loaded the database for nothing.
  // The full results go to profiles once, after the finals (admin Publish, or the final sync).
  const synced = process.env.SUPER32_SYNC_EACH_PULL === "1"
    ? await syncResults(admin, SUPER32_EVENT_KEY, feed.csv, seedsUp ? parseSeedsCsv(seedsUp.content) : [], snap.data).catch((e) => ({ error: String(e) }))
    : { skipped: "profiles sync after the finals" }
  const s = snap.data.scoreboards.all
  const pushed = await sendWinAlerts(admin)
  return { status: "published" as const, bouts: feed.bouts, nc: `${s.wins}-${s.losses}`, ncBouts: after, alertsQueued: snap.alertsQueued, pushed, synced }
}

/** Sends every waiting Huge/Big win alert. Only after a publish, so the tap lands on the result. */
export async function sendWinAlerts(admin: SupabaseClient) {
  if (process.env.SUPER32_LIVE_PUSH !== "1") return { skipped: "push off" }
  const { data: waiting } = await admin.from("super32_live_alerts").select("id, title, body, path")
    .eq("event_key", SUPER32_EVENT_KEY).in("kind", ["huge", "big"]).eq("status", "pending").order("created_at")
  let sent = 0
  for (const a of waiting ?? []) {
    // Claim first so two overlapping runs cannot both send it.
    const { data: claimed } = await admin.from("super32_live_alerts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", a.id).eq("status", "pending").select("id")
    if (!claimed?.length) continue
    try {
      const r = await sendToSubscribers("alert_results", { title: a.title, body: a.body, data: { kind: "super32-live", path: a.path } })
      await admin.from("super32_live_alerts").update({ sent_count: r.sent }).eq("id", a.id)
      sent += 1
    } catch (e) {
      await admin.from("super32_live_alerts").update({ status: "pending", sent_at: null }).eq("id", a.id)
      console.error("[super32-flo] win alert failed", e)
    }
  }
  return { sent }
}
