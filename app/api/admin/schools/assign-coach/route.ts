import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const { userId, schoolId } = await request.json()

    console.log("[v0] Assigning coach:", { userId, schoolId })

    if (!userId || !schoolId) {
      return NextResponse.json({ error: "Missing userId or schoolId" }, { status: 400 })
    }

    const { data: existingProfile } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

    // Get user data from auth to populate profile
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)

    const fullName =
      authUser.user?.user_metadata?.full_name ||
      `${authUser.user?.user_metadata?.first_name || ""} ${authUser.user?.user_metadata?.last_name || ""}`.trim() ||
      authUser.user?.email?.split("@")[0] ||
      "Unnamed User"

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          school_id: schoolId,
          role: "college_coach",
          full_name: fullName,
          email: authUser.user?.email,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (updateError) {
        console.error("[v0] Error updating profile:", updateError)
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabase.from("user_profiles").insert({
        user_id: userId,
        school_id: schoolId,
        role: "college_coach",
        full_name: fullName,
        email: authUser.user?.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("[v0] Error creating profile:", insertError)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
      }
    }

    console.log("[v0] Successfully assigned coach to school")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error assigning coach:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
