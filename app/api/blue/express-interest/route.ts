import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const ACHIEVEMENT_VALUES = ["all_american", "state_champion", "state_placer", "state_qualifier", "na"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const adminClient = createAdminClient()

    const firstName = body.firstName?.trim()
    const lastName = body.lastName?.trim()
    const cell = body.cell?.trim()
    const graduationYear = body.graduationYear?.trim()
    const highestAchievement = body.highestAchievement?.trim()
    const highSchool = body.highSchool?.trim() || null
    const club = body.club?.trim() || null
    const comments = body.comments?.trim() || null

    if (!firstName) return NextResponse.json({ ok: false, error: "First name is required" }, { status: 400 })
    if (!lastName) return NextResponse.json({ ok: false, error: "Last name is required" }, { status: 400 })
    if (!cell) return NextResponse.json({ ok: false, error: "Cell phone is required" }, { status: 400 })
    if (!graduationYear) return NextResponse.json({ ok: false, error: "Graduation year is required" }, { status: 400 })
    if (!highestAchievement || !ACHIEVEMENT_VALUES.includes(highestAchievement as (typeof ACHIEVEMENT_VALUES)[number])) {
      return NextResponse.json({ ok: false, error: "Highest achievement is required" }, { status: 400 })
    }

    const { error: dbError } = await adminClient
      .from("blue_express_interest")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          cell_phone: cell,
          graduation_year: graduationYear,
          highest_achievement: highestAchievement,
          high_school: highSchool,
          club: club,
          comments: comments,
        },
      ])

    if (dbError) {
      console.error("[Blue express-interest] DB error:", dbError)
      if (dbError.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Submissions are not available yet. Please try again later." },
          { status: 503 }
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save submission" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Blue express-interest] Error:", error)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
