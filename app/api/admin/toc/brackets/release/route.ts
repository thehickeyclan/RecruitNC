import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { readBracketRelease, setBracketRelease } from "@/lib/toc/bracket-release"
import { listPublicBracketSummaries } from "@/lib/toc/bracket-service"
import { TOC_PUBLIC_FIELD_TAG, warmPublicAnnouncedField } from "@/lib/toc/public-announced-field"
import { notifyTocBracketsReleased } from "@/lib/toc/bracket-release-notification"

/**
 * Long enough for a cold rebuild.
 *
 * Reconciling every wrestler in the field takes about thirty seconds when nothing is cached, and
 * Vercel's default cut it off well before that — which surfaces as a failed request rather than a
 * slow one. The cache means this is rare; the ceiling means it does not fail when it happens.
 */
export const maxDuration = 60

export const dynamic = "force-dynamic"

/**
 * Releasing the tournament's brackets to the app.
 *
 * Staff-only, and a database row rather than an environment variable, because this is a thing
 * done on a Friday morning from the admin page rather than a deploy.
 *
 * Only weights whose draw is locked ever reach the app, so the count of those is reported here:
 * pressing release with three weights locked publishes three brackets, and the button should say
 * so before it is pressed rather than after.
 */

async function state(admin: ReturnType<typeof createAdminClientFresh>) {
  const [release, summaries] = await Promise.all([
    readBracketRelease(admin),
    listPublicBracketSummaries(admin).catch(() => []),
  ])
  // `source: "locked"` is the published draw; "live" is a preview built from current seeds and is
  // not published. There is no `locked` boolean on this type — reading one gave a constant zero.
  const locked = summaries.filter((s) => s.source === "locked").map((s) => s.weightClass)
  return { ...release, lockedWeights: locked, wouldPublish: locked.length }
}

export async function GET() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  return NextResponse.json(await state(createAdminClientFresh()))
}

export async function POST(request: Request) {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  // Releasing is Matt's alone. Scoped seeders can read the board and seed it; they cannot publish.
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

  const parsed = z.object({ released: z.boolean() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const admin = createAdminClientFresh()
  // Read before writing: pressing release on something already released must not alert twice.
  const before = await state(admin)
  const result = await setBracketRelease(admin, parsed.data.released, auth.userId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  const after = await state(admin)

  /*
   * The public field is cached per weight — the credential engine reconciles each wrestler by
   * name, which is too slow to redo on every request. Releasing brackets changes what that screen
   * shows, and this is the one moment in the tournament where a stale minute is unacceptable.
   */
  revalidateTag(TOC_PUBLIC_FIELD_TAG)
  // Awaited, not fired and forgotten. Dropping the tag without rebuilding hands the
  // thirty-second cold read to whichever parent opens the app next, and that is precisely the
  // minute they will be looking. Staff carry the wait instead.
  await warmPublicAnnouncedField().catch((error) => {
    // A failed warm is a slow first read, not a failed announcement. Never fail the action.
    console.warn("[toc] field warm failed:", error)
  })

  /**
   * One alert, and only on the transition.
   *
   * Awaited rather than dropped: Vercel freezes the isolate once the response is sent, and a
   * loose promise here is a release nobody hears about. It never throws, so a failed push cannot
   * fail a release that has already happened.
   */
  let notified: { sent: number; failed: number } | null = null
  if (parsed.data.released && !before.released) {
    notified = await notifyTocBracketsReleased(after.lockedWeights)
  }

  return NextResponse.json({ ...after, notified })
}
