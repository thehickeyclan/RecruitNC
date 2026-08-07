import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocCollegeCoachConfirmation } from "@/lib/toc/email"

export const dynamic = "force-dynamic"
const ATTENDANCE = new Set(["friday", "saturday", "both"])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const coachName = String(body.coachName ?? "")
      .trim()
      .slice(0, 160)
    const collegeProgram = String(body.collegeProgram ?? "")
      .trim()
      .slice(0, 200)
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 320)
    const mobilePhone = String(body.mobilePhone ?? "")
      .trim()
      .slice(0, 40)
    const attendance = String(body.attendance ?? "").trim()
    const staffCount = Number(body.staffCount)
    if (!coachName || !collegeProgram) return NextResponse.json({ error: "Name and college are required" }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    if (!mobilePhone) return NextResponse.json({ error: "Mobile number is required" }, { status: 400 })
    if (!ATTENDANCE.has(attendance)) return NextResponse.json({ error: "Select attendance days" }, { status: 400 })
    if (!Number.isInteger(staffCount) || staffCount < 1 || staffCount > 12) return NextResponse.json({ error: "Coach count must be between 1 and 12" }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from("toc_college_coaches").upsert(
      {
        coach_name: coachName,
        college_program: collegeProgram,
        email,
        mobile_phone: mobilePhone,
        attendance,
        staff_count: staffCount,
        status: "registered",
        source: "registration",
        opted_out: false,
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )
    if (error) {
      console.error("[toc college coach registration]", error)
      return NextResponse.json({ error: "Registration is temporarily unavailable" }, { status: 503 })
    }

    void sendTocCollegeCoachConfirmation(email, coachName, collegeProgram, attendance, staffCount)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[toc college coach registration]", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
