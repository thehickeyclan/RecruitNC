import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTocWelcomeEmail } from "@/lib/toc/email"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? "").trim().toLowerCase()
    const source = String(body.source ?? "unknown").trim().slice(0, 64)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: existing, error: existingError } = await admin
      .from("toc_email_subscribers")
      .select("id, segments")
      .eq("email", email)
      .maybeSingle()

    if (existingError && existingError.code !== "PGRST116") {
      console.error("[toc/email-signup] existing", existingError)
      if (existingError.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Signups are not available yet. Please try again later." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
    }

    const existingSegments = Array.isArray(existing?.segments)
      ? existing.segments.map((x) => String(x).trim()).filter(Boolean)
      : []
    const segments = [...new Set([...existingSegments, "toc"])]

    const { error } = existing?.id
      ? await admin
          .from("toc_email_subscribers")
          .update({ source, segments, unsubscribed: false })
          .eq("id", existing.id)
      : await admin.from("toc_email_subscribers").insert({ email, source, segments, unsubscribed: false })

    if (error) {
      console.error("[toc/email-signup]", error)
      if (error.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Signups are not available yet. Please try again later." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
    }

    void sendTocWelcomeEmail(email)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[toc/email-signup]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
