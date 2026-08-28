import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { getPublicAnnouncedWeight } from "@/lib/toc/public-announced-field"
import { shortenRealName, validateDisplayName } from "@/lib/toc/pool-display-name"

/**
 * The name an entrant appears under on the leaderboard.
 *
 * Optional. Without one an entrant shows as a first name and a last initial, which is what the
 * board did for everybody before — so nobody has to do anything, and anybody who would rather not
 * have part of their child's real name on a public board has a way out.
 */

export const dynamic = "force-dynamic"

export const TABLE = "toc_pool_display_names"

/** Every wrestler in the announced field, so nobody can enter as one of them. */
async function announcedFieldNames(): Promise<string[]> {
  const names: string[] = []
  for (const weightClass of TOC_WEIGHT_CLASSES) {
    const weight = await getPublicAnnouncedWeight(weightClass)
    for (const athlete of weight?.athletes ?? []) if (athlete.name) names.push(athlete.name)
  }
  return names
}

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to see your leaderboard name." }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: chosen }, { data: profile }] = await Promise.all([
    admin.from(TABLE).select("display_name").eq("user_id", userId).maybeSingle(),
    admin.from("user_profiles").select("full_name").eq("user_id", userId).maybeSingle(),
  ])

  return NextResponse.json({
    displayName: chosen?.display_name ?? null,
    fallback: shortenRealName(profile?.full_name ?? null, "Entrant"),
  })
}

export async function POST(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to set a leaderboard name." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { displayName?: unknown } | null
  const admin = createAdminClient()

  // An empty name is how somebody goes back to their first name and last initial.
  const raw = typeof body?.displayName === "string" ? body.displayName.trim() : ""
  if (!raw) {
    const { error } = await admin.from(TABLE).delete().eq("user_id", userId)
    if (error) {
      console.error("[toc pool] clear display name:", error.message)
      return NextResponse.json({ error: "Could not save that." }, { status: 500 })
    }
    return NextResponse.json({ ok: true, displayName: null })
  }

  const checked = validateDisplayName(raw, await announcedFieldNames())
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

  // Somebody else may already be using it. The unique index is what actually decides, so a race
  // that slips past this check still fails safely below rather than giving two people one name.
  const { data: taken } = await admin
    .from(TABLE)
    .select("user_id")
    .eq("display_name_key", checked.key)
    .maybeSingle()
  if (taken && String(taken.user_id) !== userId) {
    return NextResponse.json({ error: "Somebody already has that one. Try another." }, { status: 409 })
  }

  const now = new Date().toISOString()
  const { error } = await admin.from(TABLE).upsert(
    { user_id: userId, display_name: checked.name, display_name_key: checked.key, updated_at: now },
    { onConflict: "user_id" },
  )

  if (error) {
    if (/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: "Somebody already has that one. Try another." }, { status: 409 })
    }
    console.error("[toc pool] set display name:", error.message)
    return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, displayName: checked.name })
}
