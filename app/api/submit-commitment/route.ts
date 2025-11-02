import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("Received commitment submission:", data)

    // Save to the submissions table
    const { data: submission, error } = await supabase
      .from("commitment_submissions")
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        graduation_year: Number.parseInt(data.graduationYear),
        gender: data.gender,
        weight_class: data.weightClass,
        high_school: data.highSchool,
        club: data.club || null,
        college: data.college,
        achievements: data.achievements || null,
        notes: data.notes || null,
        athlete_image_url: data.athleteImageUrl || null,
        instagram_handle: data.instagramHandle || null,
        commitment_announcement_url: data.commitmentAnnouncementUrl || null,
        commit_picture_url: data.commitPictureUrl || null,
        entities: JSON.stringify(data.entities || []),
        submitted_at: new Date().toISOString(),
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving commitment:", error)
      return NextResponse.json(
        {
          error: "Failed to save commitment",
          details: error,
        },
        { status: 500 },
      )
    }

    console.log("Commitment saved successfully:", submission)

    return NextResponse.json({
      success: true,
      message: "Commitment submitted successfully!",
      id: submission.id,
    })
  } catch (error) {
    console.error("Error in submit-commitment:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
