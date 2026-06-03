import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocNominationConfirmation, sendTocAdminNominationAlert } from "@/lib/toc/email"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const athleteName = String(body.athleteName ?? "").trim()
    const school = body.school ? String(body.school).trim() : null
    const weightClass = body.weightClass != null ? Number(body.weightClass) : null
    const graduationYear = body.graduationYear != null ? Number(body.graduationYear) : null
    const submittedByName = body.submittedByName ? String(body.submittedByName).trim() : null
    const submittedByEmail = String(body.submittedByEmail ?? "").trim().toLowerCase()
    const submittedByRelationship = body.submittedByRelationship
      ? String(body.submittedByRelationship).trim()
      : null
    const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null

    if (!athleteName) {
      return NextResponse.json({ ok: false, error: "Athlete name is required" }, { status: 400 })
    }
    if (!submittedByEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedByEmail)) {
      return NextResponse.json({ ok: false, error: "Valid submitter email is required" }, { status: 400 })
    }
    if (weightClass != null && !TOC_WEIGHT_CLASSES.includes(weightClass as (typeof TOC_WEIGHT_CLASSES)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid weight class" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("toc_nominations").insert([
      {
        athlete_name: athleteName,
        school,
        weight_class: weightClass,
        graduation_year: graduationYear,
        submitted_by_name: submittedByName,
        submitted_by_email: submittedByEmail,
        submitted_by_relationship: submittedByRelationship,
        notes,
        reviewed: false,
      },
    ])

    if (error) {
      console.error("[toc/athlete-nominate]", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Nominations are not available yet. Please try again later." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save nomination" }, { status: 500 })
    }

    void sendTocNominationConfirmation(submittedByEmail, athleteName)
    void sendTocAdminNominationAlert({
      athleteName,
      school,
      weightClass,
      submitterEmail: submittedByEmail,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[toc/athlete-nominate]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
