import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/athletes/[id]/parents
 * Returns linked parents for an athlete
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { id: athleteId } = await params
  if (!athleteId?.trim()) {
    return NextResponse.json({ error: "Missing athlete ID" }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    // Get linked parent user_ids
    const { data: links, error: linksError } = await admin
      .from("parent_athlete_links")
      .select("user_id")
      .eq("athlete_id", athleteId)

    if (linksError) {
      console.error("[admin/athletes/parents] links error:", linksError)
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ parents: [] })
    }

    // Get user profiles for linked parents
    const userIds = links.map(l => l.user_id).filter(Boolean)
    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles")
      .select("user_id, full_name, first_name, last_name, email, cell_phone, profile_image_url")
      .in("user_id", userIds)

    if (profilesError) {
      console.error("[admin/athletes/parents] profiles error:", profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    return NextResponse.json({ parents: profiles || [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/athletes/parents] error:", msg)
    return NextResponse.json({ error: "Failed to load parents" }, { status: 500 })
  }
}

/**
 * POST /api/admin/athletes/[id]/parents
 * Link a parent to an athlete
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { id: athleteId } = await params
  if (!athleteId?.trim()) {
    return NextResponse.json({ error: "Missing athlete ID" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const userId = body.userId?.trim()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if link already exists
    const { data: existing } = await admin
      .from("parent_athlete_links")
      .select("id")
      .eq("athlete_id", athleteId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Parent is already linked" }, { status: 400 })
    }

    // Create the link
    const { error: insertError } = await admin
      .from("parent_athlete_links")
      .insert({
        athlete_id: athleteId,
        user_id: userId,
      })

    if (insertError) {
      console.error("[admin/athletes/parents] insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/athletes/parents] error:", msg)
    return NextResponse.json({ error: "Failed to link parent" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/athletes/[id]/parents?userId=xxx
 * Unlink a parent from an athlete
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { id: athleteId } = await params
  if (!athleteId?.trim()) {
    return NextResponse.json({ error: "Missing athlete ID" }, { status: 400 })
  }

  const url = new URL(request.url)
  const userId = url.searchParams.get("userId")?.trim()

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    const { error: deleteError } = await admin
      .from("parent_athlete_links")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("user_id", userId)

    if (deleteError) {
      console.error("[admin/athletes/parents] delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/athletes/parents] error:", msg)
    return NextResponse.json({ error: "Failed to unlink parent" }, { status: 500 })
  }
}
