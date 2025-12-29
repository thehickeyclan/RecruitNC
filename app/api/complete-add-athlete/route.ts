import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { autoFetchNHSCAForProfile } from "@/lib/nhsca-auto-fetch"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("[v0] Complete athlete creation - received data:", body)

    const supabase = await createClient()

    // Auto-fetch NHSCA placements (last 4 years) if name is provided
    const athleteName = body.name || `${body.firstName || ""} ${body.lastName || ""}`.trim()
    let nhscaResults: any[] = []
    
    if (athleteName) {
      nhscaResults = await autoFetchNHSCAForProfile(
        supabase,
        athleteName,
        body.graduationyear || body.graduationYear
      )
      console.log("[v0] Auto-fetched NHSCA results:", nhscaResults.length, "placements found")
    }

    // Prepare athlete data with all fields including NHSCA
    const athleteData = {
      name: body.name || null,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      highschool: body.highschool || body.highSchool || null,
      college: body.college || null,
      graduationyear: body.graduationyear || body.graduationYear || null,
      commitmentdate: body.commitmentdate || body.commitmentDate || null,
      weightclass: body.weightclass || body.weightClass || null,
      division: body.division || null,
      bio: body.bio || null,
      achievements: body.achievements || [],
      nhsca_2023_record: body.nhsca_2023_record || null,
      nhsca_2023_placement: body.nhsca_2023_placement || null,
      nhsca_2024_record: body.nhsca_2024_record || null,
      nhsca_2024_placement: body.nhsca_2024_placement || null,
      nhsca_2025_record: body.nhsca_2025_record || null,
      nhsca_2025_placement: body.nhsca_2025_placement || null,
      
      // Auto-fetched NHSCA results (JSONB format - preferred)
      nhsca_results: nhscaResults.length > 0 ? nhscaResults : null,
      
      // Super 32 fields
      super_32_2024_record: body.super_32_2024_record || null,
      super_32_2024_placement: body.super_32_2024_placement || null,
      super_32_2025_record: body.super_32_2025_record || null,
      super_32_2025_placement: body.super_32_2025_placement || null,
      // Other competition fields
      nationally_ranked_wins: body.nationally_ranked_wins || null,
      college_opens_experience: body.college_opens_experience || null,
      // Additional fields
      gender: body.gender || null,
      wrestlingClub: body.wrestlingClub || body.customWrestlingClub || null,
      photoUrl: body.photoUrl || null,
      commitmentPhotoUrl: body.commitmentPhotoUrl || null,
      highlightVideoUrl: body.highlightVideoUrl || null,
      careerRecord: body.careerRecord || null,
      stateRanking: body.stateRanking || null,
      nationalRanking: body.nationalRanking || null,
      location: body.location || null,
      twitterUrl: body.twitterUrl || null,
      instagramUrl: body.instagramUrl || null,
      facebookUrl: body.facebookUrl || null,
      ncUnitedTeam: body.ncUnitedTeam || null,
      contactEmail: body.contactEmail || null,
      featured: body.featured || false,
      recruiting_status: body.recruiting_status || "Uncommitted",
      prospect_ranking: body.prospect_ranking || null,
      prospect_notes: body.prospect_notes || null,
      collegeLogoUrl: body.collegeLogoUrl || null,
      academicGPA: body.academicGPA || null,
      academicSAT: body.academicSAT || null,
      academicACT: body.academicACT || null,
      academicSummary: body.academicSummary || null,
      is_prospect: body.isProspect !== false,
    }

    console.log("[v0] Creating athlete with NHSCA fields:", {
      nhsca_2023_record: athleteData.nhsca_2023_record,
      nhsca_2023_placement: athleteData.nhsca_2023_placement,
      nhsca_2024_record: athleteData.nhsca_2024_record,
      nhsca_2024_placement: athleteData.nhsca_2024_placement,
      nhsca_2025_record: athleteData.nhsca_2025_record,
      nhsca_2025_placement: athleteData.nhsca_2025_placement,
    })

    const { data, error } = await supabase.from("athletes").insert([athleteData]).select().single()

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("[v0] Successfully created complete athlete:", data)
    return NextResponse.json({ success: true, athlete: data })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Failed to create athlete" }, { status: 500 })
  }
}
