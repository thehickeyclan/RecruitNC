import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Verify user owns this profile
    const { data: athlete, error: fetchError } = await supabase
      .from("athletes")
      .select("claimed_by_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !athlete) {
      return NextResponse.json({ success: false, error: "Athlete not found" }, { status: 404 })
    }

    // Same rule as can-edit: the claimer, or a parent linked to this athlete. They must agree —
    // a page that offers an edit and an endpoint that refuses it is worse than neither.
    if (athlete.claimed_by_user_id !== user.id) {
      const { data: link } = await supabase
        .from("parent_athlete_links")
        .select("id")
        .eq("user_id", user.id)
        .eq("athlete_id", id)
        .maybeSingle()

      if (!link) {
        return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 })
      }
    }

    // Get update data from request
    const updates = await request.json()

    // Update athlete profile
    const { data: updatedAthlete, error: updateError } = await supabase
      .from("athletes")
      .update({
        socialMedia:
          updates.instagram_handle || updates.twitter_handle
            ? JSON.stringify({
                instagram: updates.instagram_handle,
                twitter: updates.twitter_handle,
              })
            : undefined,
        bio: updates.bio,
        phone: updates.phone,
        contactEmail: updates.email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error updating profile:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedAthlete })
  } catch (error) {
    console.error("[v0] Error in update-profile route:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
