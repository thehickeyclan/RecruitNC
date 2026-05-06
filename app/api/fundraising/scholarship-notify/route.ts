import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 })
  }

  const raw = typeof body.email === "string" ? body.email.trim() : ""
  if (!raw || !EMAIL_RE.test(raw)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 })
  }

  const email = raw.toLowerCase()
  const admin = createAdminClient()

  const { error } = await admin.from("fundraising_scholarship_interest_signups").insert({
    email,
    source: "hub_scholarships_card",
  })

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Signup isn’t enabled yet — ask staff to run scripts/supabase-fundraising-scholarship-interest.sql in Supabase.",
        },
        { status: 503 },
      )
    }
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    console.warn("[scholarship-notify]", error.message)
    return NextResponse.json({ ok: false, error: "Could not save — try again." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
