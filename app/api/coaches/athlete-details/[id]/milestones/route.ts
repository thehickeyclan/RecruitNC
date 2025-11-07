import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const athleteId = params.id
    const milestones = await request.json()
    const { searchParams } = new URL(request.url)
    const viewAsCoachId = searchParams.get("viewAsCoachId")
    
    const targetCoachId = viewAsCoachId || user.id

    console.log("[v0] Updating milestones for athlete:", athleteId)
    console.log("[v0] Target coach ID:", targetCoachId)
    console.log("[v0] Milestone data:", milestones)

    // Update the college_coach_stars record (milestones + financial data)
    const { data, error } = await supabase
      .from("college_coach_stars")
      .update({
        // Milestones
        first_contact_date: milestones.first_contact_date || null,
        first_contact_method: milestones.first_contact_method || null,
        has_applied: milestones.has_applied || false,
        applied_date: milestones.applied_date || null,
        campus_visit_date: milestones.campus_visit_date || null,
        campus_visit_type: milestones.campus_visit_type || null,
        official_visit_date: milestones.official_visit_date || null,
        financial_package_sent: milestones.financial_package_sent || false,
        package_sent_date: milestones.package_sent_date || null,
        package_amount: milestones.package_amount ? parseFloat(milestones.package_amount) : null,
        offer_extended: milestones.offer_extended || false,
        offer_date: milestones.offer_date || null,
        offer_details: milestones.offer_details || null,
        committed_date: milestones.committed_date || null,
        nli_signed_date: milestones.nli_signed_date || null,
        recruiting_notes: milestones.recruiting_notes || null,
        
        // Financial data (if included in the request)
        financial_efc: milestones.financial_efc || null,
        financial_aid_needs: milestones.financial_aid_needs || null,
        scholarship_requirements: milestones.scholarship_requirements || null,
        ability_to_pay: milestones.ability_to_pay || null,
        financial_notes: milestones.financial_notes || null,
        financial_concerns: milestones.financial_concerns || null,
        merit_scholarship_eligible: milestones.merit_scholarship_eligible || false,
        need_based_aid_eligible: milestones.need_based_aid_eligible || false,
        aid_application_status: milestones.aid_application_status || null,
        gi_bill_eligible: milestones.gi_bill_eligible || false,
      })
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", targetCoachId)
      .select()

    if (error) {
      console.error("[v0] Error updating milestones:", error)
      return NextResponse.json({ error: "Failed to update milestones" }, { status: 500 })
    }

    console.log("[v0] Milestones updated successfully:", data)

    return NextResponse.json({
      success: true,
      message: "Milestones updated successfully",
    })
  } catch (error) {
    console.error("Milestones update API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

