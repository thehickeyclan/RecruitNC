import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendToTokens } from "@/lib/push-send"
import { followersOfAthletes } from "@/lib/athlete-follows"
import { digestBody, digestTitle } from "@/lib/result-digest-message"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * "Journeymen results are in" — one push per event, to the people following somebody who was there.
 *
 * Deliberately a digest and not a per-result alert. Results arrive by import, in bursts: a single
 * Journeymen upload is fifty rows inside a minute, and alerting per row would send a coach fifty
 * notifications and earn a permanent trip to the Settings screen. The commit cron caps itself at
 * five a run for the same reason. One message per event per account says the useful thing once.
 *
 * `push_sent_result_digests` is the guard. A re-import, a correction, or results that trickle in
 * over two days cannot alert the same account about the same event twice.
 */

const LOOKBACK_HOURS = 36
/** Most events announced in one run; the rest wait for the next. */
const MAX_EVENTS_PER_RUN = 3

type Source = {
  table: string
  /** Column holding the finishing position, which differs by table. */
  placeColumn: string
  select: string
  /** A key that is stable for one event, so the dedupe table can hold one row per account per event. */
  keyOf: (row: Record<string, unknown>) => string | null
  labelOf: (row: Record<string, unknown>) => string
}

const SOURCES: Source[] = [
  {
    /* The one that carries Journeymen, I-64, the TOC and the qualifiers — it already has event_key. */
    table: "other_tournament_results",
    placeColumn: "placement",
    select: "athlete_id, placement, created_at, event_key, event_name, event_short_name, year",
    keyOf: (r) => (r.event_key ? String(r.event_key) : null),
    labelOf: (r) => String(r.event_short_name ?? r.event_name ?? "Tournament"),
  },
  {
    table: "nhsca_placements",
    placeColumn: "placement",
    select: "athlete_id, placement, created_at, year",
    keyOf: (r) => (r.year ? `nhsca-${r.year}` : null),
    labelOf: () => "NHSCA Nationals",
  },
  {
    table: "super32_results",
    placeColumn: "placement",
    select: "athlete_id, placement, created_at, year",
    keyOf: (r) => (r.year ? `super32-${r.year}` : null),
    labelOf: () => "Super 32",
  },
  {
    table: "fargo_results",
    placeColumn: "placement",
    select: "athlete_id, placement, created_at, year",
    keyOf: (r) => (r.year ? `fargo-${r.year}` : null),
    labelOf: () => "Fargo",
  },
  {
    table: "wrestling_nchsaa_results",
    /* This table says `place`, not `placement`. */
    placeColumn: "place",
    select: "athlete_id, place, created_at, year",
    keyOf: (r) => (r.year ? `nchsaa-${r.year}` : null),
    labelOf: () => "NCHSAA State Championships",
  },
]

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

type EventBatch = {
  key: string
  label: string
  /** athlete id → best finish we saw for them at this event, when there is one. */
  places: Map<string, number | null>
}

export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString()

  /* Everything that landed recently, grouped by the event it belongs to. */
  const events = new Map<string, EventBatch>()
  const sourceErrors: Record<string, string> = {}

  for (const source of SOURCES) {
    const { data, error } = await admin
      .from(source.table)
      .select(source.select)
      .gte("created_at", since)
      .not("athlete_id", "is", null)
    if (error) {
      sourceErrors[source.table] = error.message
      continue
    }
    for (const raw of data ?? []) {
      /* The select is built from a string, so the client cannot type these rows. */
      const row = raw as unknown as Record<string, unknown>
      const key = source.keyOf(row)
      const athleteId = String(row.athlete_id ?? "")
      if (!key || !athleteId) continue

      const batch = events.get(key) ?? { key, label: source.labelOf(row), places: new Map() }
      const rawPlace = row[source.placeColumn]
      const place = Number(rawPlace)
      const finish = Number.isFinite(place) && place > 0 ? place : null
      const existing = batch.places.get(athleteId)
      /* Keep the best finish: a wrestler can hold more than one row at one event. */
      batch.places.set(
        athleteId,
        existing == null ? finish : finish == null ? existing : Math.min(existing, finish),
      )
      events.set(key, batch)
    }
  }

  if (events.size === 0) {
    return NextResponse.json({ announced: 0, message: "No new results.", sourceErrors })
  }

  const announced: Array<Record<string, unknown>> = []
  let eventsHandled = 0

  for (const batch of events.values()) {
    if (eventsHandled >= MAX_EVENTS_PER_RUN) break

    const athleteIds = [...batch.places.keys()]
    const followers = await followersOfAthletes(admin, athleteIds)
    if (followers.size === 0) continue

    /* Invert: one message per account, naming how many of their wrestlers were there. */
    const byUser = new Map<string, string[]>()
    for (const [athleteId, userIds] of followers) {
      for (const userId of userIds) {
        const list = byUser.get(userId) ?? []
        list.push(athleteId)
        byUser.set(userId, list)
      }
    }
    if (byUser.size === 0) continue
    eventsHandled += 1

    const { data: nameRows } = await admin.from("athletes").select("id, name").in("id", athleteIds)
    const names = new Map((nameRows ?? []).map((r) => [String(r.id), String(r.name ?? "Athlete")]))

    for (const [userId, followedHere] of byUser) {
      /* Claim the account-event pair before sending; a failed send is recoverable, a repeat is not. */
      const { error: claimError } = await admin.from("push_sent_result_digests").insert({
        user_id: userId,
        event_key: batch.key,
        event_label: batch.label,
        athletes_followed: followedHere.length,
      })
      if (claimError) continue

      const { data: devices } = await admin
        .from("push_devices")
        .select("expo_push_token")
        .eq("user_id", userId)
        .eq("alert_results", true)
      const tokens = [
        ...new Set((devices ?? []).map((d) => String((d as { expo_push_token: string }).expo_push_token)).filter(Boolean)),
      ]
      if (tokens.length === 0) continue

      /*
       * The headline is the best finish among the wrestlers this account follows, because that is
       * the sentence worth reading on a lock screen. With no placement on file - a bracket we hold
       * without finishes - the count stands on its own rather than inventing a result.
       */
      const placed = followedHere
        .map((id) => ({ id, place: batch.places.get(id) ?? null }))
        .filter((a): a is { id: string; place: number } => a.place != null)
        .sort((a, b) => a.place - b.place)

      const count = followedHere.length
      const best = placed.length
        ? { name: names.get(placed[0].id) ?? "One of them", place: placed[0].place }
        : null

      const outcome = await sendToTokens("alert_results", tokens, {
        title: digestTitle(batch.label),
        body: digestBody({ count, best }),
        data: { kind: "result_digest", eventKey: batch.key, athleteIds: followedHere, path: "/following" },
      })
      await admin
        .from("push_sent_result_digests")
        .update({ recipients: outcome.sent })
        .eq("user_id", userId)
        .eq("event_key", batch.key)

      announced.push({ event: batch.label, user: userId, followed: count, ...outcome })
    }
  }

  return NextResponse.json({
    events: events.size,
    announced: announced.length,
    deferred: Math.max(0, events.size - eventsHandled),
    results: announced,
    sourceErrors,
  })
}
