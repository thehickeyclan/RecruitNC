import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClientFresh } from "@/lib/supabase/admin"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { readBracketRelease } from "@/lib/toc/bracket-release"
import { sendToSubscribers } from "@/lib/push-send"
import { sendTocMadnessReminderEmail } from "@/lib/toc/email"
import { TOC_POOL_DEADLINE } from "@/lib/toc/constants"
import {
  buildTocMadnessOpenPush,
  buildTocMadnessReminderPush,
  formatPoolDeadline,
  incompleteEntrants,
  tocMadnessSendWindow,
  type PoolEntryRow,
} from "@/lib/toc/toc-madness-notices"

/**
 * TOC Madness controls: announce it once, and remind people before picks lock.
 *
 * Kept apart from the bracket release on purpose. GO publishes the tournament; this tells people
 * the game built on top of it is open. Both refuse to act before GO, so no alert can ever say
 * TOC Madness is open while the brackets are still private.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

const CONFIG_ID = 1
const REMINDER_GAP_MS = 60 * 60_000
const MISSING_COLUMN = /column .* does not exist|could not find the .* column/i

async function lockedWeights(admin: ReturnType<typeof createAdminClientFresh>): Promise<number[]> {
  const { data } = await admin.from("toc_bracket_draws").select("weight_class")
  return (data ?? []).map((d: { weight_class: number }) => Number(d.weight_class)).sort((a, b) => a - b)
}

async function state(admin: ReturnType<typeof createAdminClientFresh>) {
  const release = await readBracketRelease(admin)
  const { data: cfg, error } = await admin
    .from("toc_event_config")
    .select("toc_madness_announced_at, toc_madness_push_reminded_at, toc_madness_email_reminded_at")
    .eq("id", CONFIG_ID)
    .maybeSingle()
  const weights = await lockedWeights(admin)
  const { data: entries } = await admin.from("toc_pool_entries").select("user_id, weight_class, submitted")
  const rows = (entries ?? []) as PoolEntryRow[]
  const entrants = new Set(rows.map((r) => r.user_id).filter(Boolean)).size
  const { count: tocDevices } = await admin.from("push_devices").select("*", { count: "exact", head: true }).eq("alert_toc", true)
  const c = (cfg ?? {}) as Record<string, string | null>
  return {
    schemaReady: !(error && MISSING_COLUMN.test(error.message)),
    released: release.released,
    deadline: TOC_POOL_DEADLINE.toISOString(),
    deadlineText: formatPoolDeadline(),
    announcedAt: c.toc_madness_announced_at ?? null,
    pushRemindedAt: c.toc_madness_push_reminded_at ?? null,
    emailRemindedAt: c.toc_madness_email_reminded_at ?? null,
    lockedWeights: weights,
    entrants,
    incomplete: incompleteEntrants(rows, weights).length,
    tocDevices: tocDevices ?? 0,
  }
}

async function authorize() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  // Sending to every phone is Matt's decision, not a seeder's.
  if (!auth.isAdmin) return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) }
  return { auth }
}

export async function GET() {
  const gate = await authorize()
  if (gate.error) return gate.error
  return NextResponse.json(await state(createAdminClientFresh()))
}

/**
 * Claim a timestamp column atomically before sending.
 *
 * The update only succeeds when the column is empty (announce) or older than the gap (reminders),
 * so two presses racing each other cannot both send — the second finds nothing to claim.
 */
async function claim(
  admin: ReturnType<typeof createAdminClientFresh>,
  column: "toc_madness_announced_at" | "toc_madness_push_reminded_at" | "toc_madness_email_reminded_at",
  now: Date,
  gapMs: number | null,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  let query = admin.from("toc_event_config").update({ [column]: now.toISOString() }).eq("id", CONFIG_ID)
  query = gapMs == null
    ? query.is(column, null)
    : query.or(`${column}.is.null,${column}.lt.${new Date(now.getTime() - gapMs).toISOString()}`)
  const { data, error } = await query.select("id")
  if (error) {
    return MISSING_COLUMN.test(error.message)
      ? { ok: false, status: 503, error: "Run the TOC Madness SQL first — the tracking columns are missing." }
      : { ok: false, status: 500, error: error.message }
  }
  if (!data?.length) return { ok: false, status: 409, error: gapMs == null ? "TOC Madness has already been announced." : "That was already sent recently." }
  return { ok: true }
}

export async function POST(request: Request) {
  const gate = await authorize()
  if (gate.error) return gate.error

  const parsed = z.object({ action: z.enum(["announce", "remind-push", "remind-email"]) }).safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const admin = createAdminClientFresh()
  const now = new Date()
  const before = await state(admin)
  if (!before.schemaReady) {
    return NextResponse.json({ error: "Run the TOC Madness SQL first — the tracking columns are missing." }, { status: 503 })
  }

  const lastSent =
    parsed.data.action === "announce" ? before.announcedAt
      : parsed.data.action === "remind-push" ? before.pushRemindedAt
        : before.emailRemindedAt
  const window = tocMadnessSendWindow({
    bracketsReleased: before.released,
    now,
    lastSentAt: parsed.data.action === "announce" ? null : lastSent,
    minGapMs: REMINDER_GAP_MS,
  })
  if (!window.ok) return NextResponse.json({ error: window.reason }, { status: 409 })

  if (parsed.data.action === "announce") {
    const claimed = await claim(admin, "toc_madness_announced_at", now, null)
    if (!claimed.ok) return NextResponse.json({ error: claimed.error }, { status: claimed.status })
    const sent = await sendToSubscribers("alert_toc", buildTocMadnessOpenPush())
    return NextResponse.json({ ...(await state(admin)), result: { kind: "push", ...sent } })
  }

  if (parsed.data.action === "remind-push") {
    const claimed = await claim(admin, "toc_madness_push_reminded_at", now, REMINDER_GAP_MS)
    if (!claimed.ok) return NextResponse.json({ error: claimed.error }, { status: claimed.status })
    const sent = await sendToSubscribers("alert_toc", buildTocMadnessReminderPush())
    return NextResponse.json({ ...(await state(admin)), result: { kind: "push", ...sent } })
  }

  // remind-email: targeted at entrants who started and have not finished.
  const claimed = await claim(admin, "toc_madness_email_reminded_at", now, REMINDER_GAP_MS)
  if (!claimed.ok) return NextResponse.json({ error: claimed.error }, { status: claimed.status })

  const { data: entries } = await admin.from("toc_pool_entries").select("user_id, weight_class, submitted")
  const rows = (entries ?? []) as PoolEntryRow[]
  const targets = incompleteEntrants(rows, before.lockedWeights)
  const { data: profiles } = targets.length
    ? await admin.from("user_profiles").select("user_id, email").in("user_id", targets)
    : { data: [] as { user_id: string; email: string | null }[] }

  let emailed = 0
  let failed = 0
  for (const profile of profiles ?? []) {
    const email = String((profile as { email?: string | null }).email ?? "").trim()
    if (!email) continue
    const submitted = rows.filter(
      (r) => r.user_id === (profile as { user_id: string }).user_id && r.submitted && before.lockedWeights.includes(Number(r.weight_class)),
    ).length
    try {
      await sendTocMadnessReminderEmail(email, submitted, before.lockedWeights.length, before.deadlineText)
      emailed++
    } catch (error) {
      failed++
      console.warn("[toc madness] reminder email failed:", error)
    }
  }
  return NextResponse.json({ ...(await state(admin)), result: { kind: "email", sent: emailed, failed, targeted: targets.length } })
}
