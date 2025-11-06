import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { athleteId, field, value, viewAsCoachId } = body

    if (!athleteId || !field) {
      return NextResponse.json({ error: "Athlete ID and field are required" }, { status: 400 })
    }

    // Determine which coach's override to update
    const targetCoachId = viewAsCoachId || user.id

    // Map field names to database column names
    const fieldMap: Record<string, string> = {
      phone: "override_phone",
      email: "override_email",
      contactEmail: "override_email",
      location: "override_location",
      gpa: "override_gpa",
      academic_gpa: "override_gpa",
      sat: "override_sat",
      academic_sat: "override_sat",
      act: "override_act",
      academic_act: "override_act",
      weight: "override_weight",
      weightclass: "override_weight",
      highschool: "override_highschool",
      graduationyear: "override_graduation_year",
      graduation_year: "override_graduation_year",
    }

    const dbField = fieldMap[field]
    if (!dbField) {
      return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 })
    }

    // Check if star record exists, create if not
    const { data: existingStar } = await supabase
      .from("college_coach_stars")
      .select("id")
      .eq("coach_user_id", targetCoachId)
      .eq("athlete_id", athleteId)
      .maybeSingle()

    let starId: string

    if (existingStar) {
      starId = existingStar.id
    } else {
      // Create new star record
      const { data: newStar, error: createError } = await supabase
        .from("college_coach_stars")
        .insert({
          coach_user_id: targetCoachId,
          athlete_id: athleteId,
          pipeline_stage: "Prospect",
          starred_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (createError || !newStar) {
        return NextResponse.json(
          { error: "Failed to create star record", details: createError?.message },
          { status: 500 }
        )
      }

      starId = newStar.id
    }

    // Prepare update value (handle null/empty strings)
    let updateValue: any = value === "" || value === null ? null : value

    // Type conversions for numeric fields
    if (dbField === "override_gpa") {
      updateValue = updateValue ? parseFloat(updateValue) : null
    } else if (dbField === "override_sat" || dbField === "override_act" || dbField === "override_graduation_year") {
      updateValue = updateValue ? parseInt(updateValue) : null
    }

    // Update the override field
    const { data, error } = await supabase
      .from("college_coach_stars")
      .update({ [dbField]: updateValue })
      .eq("id", starId)
      .select()
      .single()

    if (error) {
      console.error("Error updating athlete field:", error)
      return NextResponse.json(
        { error: "Failed to update field", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      field: dbField,
      value: updateValue,
    })
  } catch (error) {
    console.error("Update athlete field API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

