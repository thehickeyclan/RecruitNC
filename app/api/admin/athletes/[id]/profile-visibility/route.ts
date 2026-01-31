import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const athleteId = params?.id
  if (!athleteId) {
    return NextResponse.json({ error: "Missing athlete id" }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 })
    }

    const body = await req.json()
    const published = body.published === true

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from("athletes")
      .update({ profile_verified: published, updated_at: new Date().toISOString() })
      .eq("id", athleteId)
      .select("id, name, profile_verified")
      .single()

    if (error) {
      console.error("[profile-visibility] Error:", error)
      return NextResponse.json({ error: "Failed to update visibility", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      athlete: data,
      published,
    })
  } catch (err) {
    console.error("[profile-visibility] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
