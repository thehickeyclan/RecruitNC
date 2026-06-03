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
    const { error } = await admin.from("toc_email_subscribers").upsert(
      { email, source, unsubscribed: false },
      { onConflict: "email", ignoreDuplicates: false },
    )

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
