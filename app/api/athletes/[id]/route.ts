import { NextResponse } from "next/server"
import { getAthleteById } from "@/lib/athlete-service"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const athlete = await getAthleteById(params.id)

    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    return NextResponse.json(athlete)
  } catch (error) {
    console.error("Error fetching athlete:", error)
    return NextResponse.json({ error: "Failed to fetch athlete" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("athletes").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting athlete:", error)
      return NextResponse.json({ error: "Failed to delete athlete" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Athlete deleted successfully" })
  } catch (error) {
    console.error("Error deleting athlete:", error)
    return NextResponse.json({ error: "Failed to delete athlete" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const supabase = await createClient()

    const athleteData = {
      firstName: body.firstName,
      lastName: body.lastName,
      name: body.name || `${body.firstName || ""} ${body.lastName || ""}`.trim(),
      highschool: body.highschool,
      graduationyear: body.graduationyear,
      gender: body.gender,
      weightclass: body.weightclass,
      wrestlingClub: body.wrestlingClub,
      photourl: body.photoUrl || body.photourl,
      is_prospect: body.is_prospect,
      recruiting_status: body.recruiting_status,
      college: body.college,
      division: body.division,
      highSchoolLogoUrl: body.highSchoolDivision || body.highSchoolLogoUrl,
      commitmentdate: body.commitmentdate,
      collegeLogoUrl: body.collegeLogoUrl,
      academic_gpa: body.academicGPA ? Number(body.academicGPA) : null,
      academic_sat: body.academicSAT ? Number(body.academicSAT) : null,
      academic_act: body.academicACT ? Number(body.academicACT) : null,
      academic_summary: body.academic_summary,
      academic_interest: body.academic_interest,
      achievements: body.achievements,
      prospect_ranking: body.prospect_ranking,
      prospect_notes: body.prospect_notes,
      super_32_2024_record: body.super_32_2024_record,
      super_32_2024_placement: body.super_32_2024_placement,
      super_32_2025_record: body.super_32_2025_record,
      super_32_2025_placement: body.super_32_2025_placement,
      super_32_2023_record: body.super_32_2023_record,
      super_32_2023_placement: body.super_32_2023_placement,
      nationally_ranked_wins: body.nationally_ranked_wins,
      bio_headline: body.bio_headline,
      bio: body.bio,
    }

    // Remove undefined values to avoid overwriting with null
    Object.keys(athleteData).forEach((key) => {
      if (athleteData[key] === undefined) {
        delete athleteData[key]
      }
    })

    const { data, error } = await supabase.from("athletes").update(athleteData).eq("id", params.id).select().single()

    if (error) {
      return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Athlete Update API: Unexpected error:", error)
    return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 })
  }
}
