import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocSponsorAutoReply, sendTocAdminSponsorAlert } from "@/lib/toc/email"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const company = String(body.company ?? "").trim()
    const contactName = String(body.contactName ?? "").trim()
    const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase()
    const contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null
    const tierInterest = body.tierInterest ? String(body.tierInterest).trim() : null
    const message = body.message ? String(body.message).trim().slice(0, 2000) : null

    if (!company) return NextResponse.json({ ok: false, error: "Company is required" }, { status: 400 })
    if (!contactName) return NextResponse.json({ ok: false, error: "Contact name is required" }, { status: 400 })
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("toc_sponsor_inquiries").insert([
      {
        company,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        tier_interest: tierInterest,
        message,
        status: "new",
      },
    ])

    if (error) {
      console.error("[toc/sponsor-inquiry]", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Inquiries are not available yet. Please try again later." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save inquiry" }, { status: 500 })
    }

    void sendTocSponsorAutoReply(contactEmail, company)
    void sendTocAdminSponsorAlert({ company, contactName, contactEmail })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[toc/sponsor-inquiry]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
