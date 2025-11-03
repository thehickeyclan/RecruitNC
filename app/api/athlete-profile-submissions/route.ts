import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    console.log("[Profile Submission] Received body:", JSON.stringify(body, null, 2))

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.gender || !body.graduationYear || !body.email) {
      return NextResponse.json({ 
        error: "Missing required fields",
        details: "firstName, lastName, gender, graduationYear, and email are required"
      }, { status: 400 })
    }

    // Build insert object - only include fields that have values
    const insertData: any = {
        // Basic info
        firstname: body.firstName,
        lastname: body.lastName,
        gender: body.gender,
        graduationyear: Number.parseInt(body.graduationYear, 10),
        weightclass: body.weightClass,
        college_weight_class: body.collegeWeightClass || null,
        highschool: body.highSchool,
        high_school_division: body.highSchoolDivision || null,
        wrestling_club: body.wrestlingClub || null,
        location: body.location || null,
        email: body.email,
        phone: body.phone || null,
        
        // Bio & achievements
        bio_headline: body.bioHeadline || null,
        bio: body.bio || null,
        achievements: body.achievements || null,
        additional_achievements: body.additionalAchievements || null,
        career_record: body.careerRecord || null,
        
        // Social media
        instagram: body.instagram || null,
        twitter: body.twitter || null,
        facebook: body.facebook || null,
        
        // Academic
        gpa: body.gpa ? Number.parseFloat(body.gpa) : null,
        sat: body.sat ? Number.parseInt(body.sat, 10) : null,
        act: body.act ? Number.parseInt(body.act, 10) : null,
        academic_summary: body.academicSummary || null,
        academic_interest: body.academicInterest || null,
        
        // Tournament records
        super_32_2023_record: body.super32_2023_record || null,
        super_32_2023_placement: body.super32_2023_placement || null,
        super_32_2024_record: body.super32_2024_record || null,
        super_32_2024_placement: body.super32_2024_placement || null,
        super_32_2025_record: body.super32_2025_record || null,
        super_32_2025_placement: body.super32_2025_placement || null,
        nhsca_2023_record: body.nhsca_2023_record || null,
        nhsca_2023_placement: body.nhsca_2023_placement || null,
        nhsca_2024_record: body.nhsca_2024_record || null,
        nhsca_2024_placement: body.nhsca_2024_placement || null,
        nhsca_2025_record: body.nhsca_2025_record || null,
        nhsca_2025_placement: body.nhsca_2025_placement || null,
        nationally_ranked_wins: body.nationallyRankedWins || null,
        college_opens_experience: body.collegeOpensExperience || null,
        
        // Media
        highlight_video_url: body.highlightVideoUrl || null,
        headshot_url: body.headshotUrl || null,
        
        status: "pending",
        submitted_at: new Date().toISOString(),
    }

    // Validate graduationyear is a valid number
    if (Number.isNaN(insertData.graduationyear)) {
      return NextResponse.json({ 
        error: "Invalid graduation year",
        details: `"${body.graduationYear}" is not a valid number`
      }, { status: 400 })
    }

    // Remove null/undefined values to avoid inserting into non-existent columns
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === null || insertData[key] === undefined) {
        delete insertData[key]
      }
    })

    console.log("[Profile Submission] Prepared insert data:", JSON.stringify(insertData, null, 2))

    const { data, error } = await supabase
      .from("athlete_profile_submissions")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("[Profile Submission] Database error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: "Failed to submit profile", 
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 })
    }

    console.log("[Profile Submission] Success! Submission ID:", data?.id)
    return NextResponse.json({ success: true, submission: data }, { status: 201 })
  } catch (error: any) {
    console.error("[Profile Submission] Unexpected error:", {
      message: error?.message,
      stack: error?.stack,
      error: error
    })
    return NextResponse.json({ 
      error: "Internal server error",
      details: error?.message || "Unknown error occurred"
    }, { status: 500 })
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
