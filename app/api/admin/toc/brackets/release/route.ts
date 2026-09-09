import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { readBracketRelease, setBracketRelease } from "@/lib/toc/bracket-release"
import { listPublicBracketSummaries } from "@/lib/toc/bracket-service"

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
  const result = await setBracketRelease(admin, parsed.data.released, auth.userId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json(await state(admin))
}
