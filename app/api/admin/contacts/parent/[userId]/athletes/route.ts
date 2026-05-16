import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      return NextResponse.json({ error: "Already linked" }, { status: 400 })
    }

    // Create the link
    const { error } = await admin
      .from("parent_athlete_links")
      .insert({
        user_id: userId,
        athlete_id: athleteId,
      })

    if (error) {
      console.error("[admin/contacts/parent/athletes] Insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/contacts/parent/athletes] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")
    
    if (!athleteId) {
      return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from("parent_athlete_links")
      .delete()
      .eq("user_id", userId)
      .eq("athlete_id", athleteId)

    if (error) {
      console.error("[admin/contacts/parent/athletes] Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[admin/contacts/parent/athletes] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
