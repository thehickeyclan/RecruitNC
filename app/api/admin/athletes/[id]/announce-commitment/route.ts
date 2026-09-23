import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { sendToSubscribers } from "@/lib/push-send"

/**
 * Announce a commitment now, rather than hoping the hourly cron agrees it is recent.
 *
 * The cron decides from `commitmentdate`, which is the day the wrestler committed — not the day
 * we found out. A commitment entered honestly with its real date, weeks after the fact, falls
 * outside the window and is never announced at all: Jeshurun Mills to Ferrum missed it by a day,
 * Mason Hocker to Duke by a month. Saving the record looked like it should have told everybody
 * and silently did not.
 *
 * So this is the deliberate version — a person decides this one is worth 169 phones buzzing, and
 * presses a button. `push_sent_commits` is still the guard: an athlete is announced once, ever,
 * whether it was the cron or a human who sent it.
 */

export const dynamic = "force-dynamic"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const athleteId = String(id ?? "").trim()
  if (!athleteId) return NextResponse.json({ error: "Missing athlete id" }, { status: 400 })

  const admin = createAdminClient()
  const { data: athlete, error } = await admin
    .from("athletes")
    .select("id, name, college")
    .eq("id", athleteId)
    .maybeSingle()

  if (error || !athlete) return NextResponse.json({ error: "That athlete does not exist." }, { status: 404 })
  if (!athlete.college?.trim()) {
    return NextResponse.json({ error: "Set the college before announcing the commitment." }, { status: 400 })
  }

  // Claim before sending, exactly as the cron does: a missed alert is recoverable, a duplicate
  // blast to every phone is not.
  const { error: claimError } = await admin.from("push_sent_commits").insert({ athlete_id: athlete.id })
  if (claimError) {
    return NextResponse.json(
      { error: `${athlete.name} has already been announced. A commitment is announced once, ever.` },
      { status: 409 },
    )
  }

  try {
    const outcome = await sendToSubscribers("alert_commits", {
      title: "New commitment",
      body: `${athlete.name} commits to ${athlete.college}`,
      data: { type: "commit", athleteId: athlete.id },
    })
    return NextResponse.json({ ok: true, athlete: athlete.name, college: athlete.college, ...outcome })
  } catch (sendError) {
    return NextResponse.json(
      { error: sendError instanceof Error ? sendError.message : "Could not send the alert." },
      { status: 500 },
    )
  }
}
