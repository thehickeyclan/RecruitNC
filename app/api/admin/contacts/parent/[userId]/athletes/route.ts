import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isRecruitNCAdmin } from "@/lib/admin"

// POST - Link an athlete to parent
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isRecruitNCAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await params
    const { athleteId } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if link already exists
    const { data: existing } = await admin
      .from("parent_athlete_links")
      .select("id")
      .eq("user_id", userId)
      .eq("athlete_id", athleteId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Athlete already linked" }, { status: 400 })
    }

    // Create the link
    const { error: insertError } = await admin
      .from("parent_athlete_links")
      .insert({
        user_id: userId,
        athlete_id: athleteId,
      })

    if (insertError) {
      console.error("[admin/contacts/parent/athletes] Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/contacts/parent/athletes] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Unlink an athlete from parent
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isRecruitNCAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error: deleteError } = await admin
      .from("parent_athlete_links")
      .delete()
      .eq("user_id", userId)
      .eq("athlete_id", athleteId)

    if (deleteError) {
      console.error("[admin/contacts/parent/athletes] Delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/contacts/parent/athletes] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
