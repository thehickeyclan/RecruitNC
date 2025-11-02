import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from("athlete_profile_submissions")
      .insert({
        firstname: body.firstName,
        lastname: body.lastName,
        gender: body.gender,
        graduationyear: Number.parseInt(body.graduationYear),
        weightclass: body.weightClass,
        highschool: body.highSchool,
        wrestling_club: body.wrestlingClub || null,
        location: body.location || null,
        email: body.email,
        phone: body.phone || null,
        bio: body.bio || null,
        achievements: body.achievements || null,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting profile submission:", error)
      return NextResponse.json({ error: "Failed to submit profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, submission: data }, { status: 201 })
  } catch (error) {
    console.error("Error in profile submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: submissions, error } = await supabase
      .from("athlete_profile_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })

    if (error) {
      console.error("Error fetching submissions:", error)
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
    }

    return NextResponse.json({ submissions }, { status: 200 })
  } catch (error) {
    console.error("Error in GET profile submissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
