/**
 * Every few minutes during Super 32: pull Flo's results feed, and when it changed, upload, build
 * and publish exactly as the admin page would. Push alerts still only queue for Matt to send.
 * A build that would lose NC bouts against the published one is left unpublished for a look.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchFloResultsCsv } from "./flo-feed"
import { buildSnapshot, latestSnapshot, latestUpload, parseSeedsCsv, SUPER32_EVENT_KEY, type SnapshotData } from "./snapshot"
import { syncResults } from "./sync"

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
  const synced = await syncResults(admin, SUPER32_EVENT_KEY, feed.csv, seedsUp ? parseSeedsCsv(seedsUp.content) : [], snap.data).catch((e) => ({ error: String(e) }))
  const s = snap.data.scoreboards.all
  return { status: "published" as const, bouts: feed.bouts, nc: `${s.wins}-${s.losses}`, ncBouts: after, alertsQueued: snap.alertsQueued, synced }
}
