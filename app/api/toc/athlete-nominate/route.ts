import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocAthleteInterestConfirmation, sendTocAdminAthleteInterestAlert } from "@/lib/toc/email"
import { TOC_GRADUATION_YEARS, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const athleteName = String(body.athleteName ?? "").trim()
    const email = String(body.email ?? body.submittedByEmail ?? "").trim().toLowerCase()
    const school = String(body.school ?? "").trim()
    const club = body.club ? String(body.club).trim() : null
    const weightClass = body.weightClass != null ? Number(body.weightClass) : null
    const graduationYear = body.graduationYear != null ? Number(body.graduationYear) : null
    const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null

    if (!athleteName) {
      return NextResponse.json({ ok: false, error: "Your name is required" }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "A valid email is required" }, { status: 400 })
    }
    if (!school) {
      return NextResponse.json({ ok: false, error: "High school is required" }, { status: 400 })
    }
    if (weightClass == null || !TOC_WEIGHT_CLASSES.includes(weightClass as (typeof TOC_WEIGHT_CLASSES)[number])) {
      return NextResponse.json({ ok: false, error: "Select a valid weight class" }, { status: 400 })
    }
    if (
      graduationYear == null ||
      !TOC_GRADUATION_YEARS.includes(String(graduationYear) as (typeof TOC_GRADUATION_YEARS)[number])
    ) {
      return NextResponse.json({ ok: false, error: "Select a valid graduation year" }, { status: 400 })
    }

    const row: Record<string, unknown> = {
      athlete_name: athleteName,
      school,
      weight_class: weightClass,
      graduation_year: graduationYear,
      submitted_by_name: athleteName,
      submitted_by_email: email,
      submitted_by_relationship: "athlete",
      notes,
      reviewed: false,
    }
    if (club) row.club = club

    const admin = createAdminClient()
    let { error } = await admin.from("toc_nominations").insert([row])

    if (error?.code === "42703" && club) {
      const { club: _club, ...withoutClub } = row
      const clubNote = `Club: ${club}${notes ? `\n\n${notes}` : ""}`
      withoutClub.notes = clubNote
      ;({ error } = await admin.from("toc_nominations").insert([withoutClub]))
    }

    if (error) {
      console.error("[toc/athlete-nominate]", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Submissions are not available yet. Please try again later." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save submission" }, { status: 500 })
    }

    void sendTocAthleteInterestConfirmation(email, athleteName)
    void sendTocAdminAthleteInterestAlert({
      athleteName,
      school,
      club,
      weightClass,
      graduationYear,
      email,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[toc/athlete-nominate]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
