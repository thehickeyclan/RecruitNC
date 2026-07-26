import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function mergeSegments(raw: unknown, segment: string) {
  const existing = Array.isArray(raw) ? raw.map((x) => String(x).trim()).filter(Boolean) : []
  return [...new Set([...existing, segment])]
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email ?? "").trim().toLowerCase()
    const source = String(body.source ?? "news_subscribe").trim().slice(0, 64)
    const segment = String(body.segment ?? "united_ascent").trim().slice(0, 64) || "united_ascent"

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: existing, error: existingError } = await admin
      .from("toc_email_subscribers")
      .select("id, segments")
      .eq("email", email)
      .maybeSingle()

    if (existingError && existingError.code !== "PGRST116") {
      console.error("[news/subscribe] existing", existingError)
      if (existingError.code === "42P01") {
        return NextResponse.json(
          { ok: false, error: "Email subscriptions are not available yet. Please try again later." },
          { status: 503 },
        )
      }
      return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
    }

    if (existing?.id) {
      const { error } = await admin
        .from("toc_email_subscribers")
        .update({
          source,
          segments: mergeSegments(existing.segments, segment),
          unsubscribed: false,
        })
        .eq("id", existing.id)

      if (error) {
        console.error("[news/subscribe] update", error)
        return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
      }
    } else {
      const { error } = await admin.from("toc_email_subscribers").insert({
        email,
        source,
        segments: [segment],
        unsubscribed: false,
      })

      if (error) {
        console.error("[news/subscribe] insert", error)
        if (error.code === "42P01") {
          return NextResponse.json(
            { ok: false, error: "Email subscriptions are not available yet. Please try again later." },
            { status: 503 },
          )
        }
        return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[news/subscribe]", e)
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 })
  }
}
