import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { graduationYear, gender, publicationRequestId } = await request.json()

    if (!graduationYear || !gender) {
      return NextResponse.json({ error: "Graduation year and gender are required" }, { status: 400 })
    }

    // Call the publish function
    const { data, error } = await supabase.rpc("publish_rankings", {
      p_graduation_year: graduationYear,
      p_gender: gender,
      p_publication_request_id: publicationRequestId || null,
    })

    if (error) {
      console.error("Error publishing rankings:", error)
      return NextResponse.json({ error: "Failed to publish rankings" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      published: data,
      message: `Rankings published for ${gender} Class of ${graduationYear}`,
    })
  } catch (error) {
    console.error("Error in publish rankings API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
