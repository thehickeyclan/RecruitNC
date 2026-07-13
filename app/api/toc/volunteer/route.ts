import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocAdminVolunteerAlert, sendTocVolunteerAutoReply } from "@/lib/toc/email"
import { TOC_VOLUNTEER_AVAILABILITY, TOC_VOLUNTEER_ROLES } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

const ROLE_VALUES = new Set(TOC_VOLUNTEER_ROLES.map((r) => r.value))
const AVAILABILITY_VALUES = new Set(TOC_VOLUNTEER_AVAILABILITY.map((a) => a.value))

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const contactName = String(body.contactName ?? "").trim()
    const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase()
    const contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null
    const roleInterest = body.roleInterest ? String(body.roleInterest).trim() : null
    const availabilityRaw = Array.isArray(body.availability) ? body.availability : []
    const availability = availabilityRaw
      .map((v: unknown) => String(v).trim())
      .filter((v) => AVAILABILITY_VALUES.has(v as (typeof TOC_VOLUNTEER_AVAILABILITY)[number]["value"]))
    const message = body.message ? String(body.message).trim().slice(0, 2000) : null

    if (!contactName) return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 })
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 })
    }
    if (availability.length === 0) {
      return NextResponse.json({ ok: false, error: "Select at least one availability option" }, { status: 400 })
    }
    if (roleInterest && !ROLE_VALUES.has(roleInterest as (typeof TOC_VOLUNTEER_ROLES)[number]["value"])) {
      return NextResponse.json({ ok: false, error: "Invalid role selection" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("toc_volunteer_signups").insert([
      {
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        role_interest: roleInterest,
        availability,
        message,
        status: "new",
      },
    ])

    if (error) {
      console.error("[toc/volunteer]", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Volunteer signups are not available yet. Please email us directly." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save signup" }, { status: 500 })
    }

    void sendTocVolunteerAutoReply(contactEmail, contactName)
    void sendTocAdminVolunteerAlert({ contactName, contactEmail, roleInterest, availability })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[toc/volunteer]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
