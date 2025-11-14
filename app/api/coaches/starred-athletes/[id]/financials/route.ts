import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const athleteId = params.id
    const body = await request.json()

    // Find the coach's star record for this athlete
    const { data: existingStar, error: findError } = await supabase
      .from("college_coach_stars")
      .select("id")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .single()

    if (findError && findError.code !== "PGRST116") {
      console.error("Error finding star record:", findError)
      return NextResponse.json({ error: "Failed to find athlete record" }, { status: 500 })
    }

    // Prepare update data
    const updateData: any = {
      financial_efc: body.efc || null,
      financial_aid_needs: body.aidNeeds || null,
      scholarship_requirements: body.scholarshipRequirements || null,
      ability_to_pay: body.abilityToPay || null,
      financial_notes: body.financialNotes || null,
      merit_scholarship_eligible: body.meritScholarshipEligible || false,
      need_based_aid_eligible: body.needBasedAidEligible || false,
      aid_application_status: body.aidApplicationStatus || null,
      financial_concerns: body.financialConcerns || null,
      gi_bill_eligible: body.giBillEligible || false,
      updated_at: new Date().toISOString(),
    }

    if (existingStar) {
      // Update existing record
      const { data, error } = await supabase
        .from("college_coach_stars")
        .update(updateData)
        .eq("id", existingStar.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating financial information:", error)
        return NextResponse.json({ error: "Failed to update financial information" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Create new record if it doesn't exist
      const { data, error } = await supabase
        .from("college_coach_stars")
        .insert({
          coach_user_id: user.id,
          athlete_id: athleteId,
          ...updateData,
          starred_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating financial record:", error)
        return NextResponse.json({ error: "Failed to save financial information" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error) {
    console.error("Error in financials endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
