import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.json()

    console.log("[Create Profile] Received body:", JSON.stringify(formData, null, 2))

    // Validate required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "gender",
      "graduationYear",
      "weightClass",
      "highSchool",
      "location",
    ]
    for (const field of requiredFields) {
      if (!formData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 })
      }
    }

    // Build insert object - use lowercase column names to match database schema
    const insertData: any = {
      user_id: user.id,
      // Basic info (lowercase because Postgres stores them that way)
      firstname: formData.firstName,
      lastname: formData.lastName,
      email: formData.email,
      phone: formData.phone || null,
      gender: formData.gender,
      graduationyear: Number.parseInt(formData.graduationYear, 10),
      weightclass: formData.weightClass,
      highschool: formData.highSchool,
      location: formData.location,
      bio: formData.bio || null,
      achievements: formData.achievements || null,
      headshot_url: formData.photoUrl || null,
      photourl: formData.photoUrl || null, // Also set photourl for consistency
      status: "pending",
      submitted_at: new Date().toISOString(),
    }

    // Validate graduationyear is a valid number
    if (Number.isNaN(insertData.graduationyear)) {
      return NextResponse.json({ 
        error: "Invalid graduation year",
        details: `"${formData.graduationYear}" is not a valid number`
      }, { status: 400 })
    }

    // Remove null/undefined values to avoid inserting into non-existent columns
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === null || insertData[key] === undefined) {
        delete insertData[key]
      }
    })

    console.log("[Create Profile] Prepared insert data:", JSON.stringify(insertData, null, 2))

    // Create athlete profile submission
    const { data, error } = await supabase
      .from("athlete_profile_submissions")
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error("[Create Profile] Database error:", {
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

    console.log("[Create Profile] Success! Submission ID:", data?.id)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[Create Profile] Unexpected error:", {
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
