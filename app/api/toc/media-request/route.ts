import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocAdminMediaAlert, sendTocMediaAutoReply } from "@/lib/toc/email"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const outlet = String(body.outlet ?? "").trim()
    const contactName = String(body.contactName ?? "").trim()
    const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase()
    const contactPhone = body.contactPhone ? String(body.contactPhone).trim() : null
    const mediaType = body.mediaType ? String(body.mediaType).trim() : null
    const message = body.message ? String(body.message).trim().slice(0, 2000) : null

    if (!outlet) return NextResponse.json({ ok: false, error: "Outlet is required" }, { status: 400 })
    if (!contactName) return NextResponse.json({ ok: false, error: "Contact name is required" }, { status: 400 })
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("toc_media_requests").insert([
      {
        outlet,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        media_type: mediaType,
        message,
        status: "new",
      },
    ])

    if (error) {
      console.error("[toc/media-request]", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Media requests are not available yet. Please email us directly." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save request" }, { status: 500 })
    }

    void sendTocMediaAutoReply(contactEmail, outlet)
    void sendTocAdminMediaAlert({ outlet, contactName, contactEmail, mediaType })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[toc/media-request]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
