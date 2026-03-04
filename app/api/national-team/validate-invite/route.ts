import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const DEFAULT_EVENT_SLUG = "nhsca-duals-2026"

/** POST { code: string, eventSlug?: string } — validate invite code for national team registration */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === "string" ? body.code.trim() : ""
    const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug.trim() || DEFAULT_EVENT_SLUG : DEFAULT_EVENT_SLUG

    if (!code) {
      return NextResponse.json({ valid: false, error: "Invite code is required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: row, error } = await admin
      .from("national_team_invite_codes")
      .select("id, max_uses, uses_count, expires_at")
      .eq("event_slug", eventSlug)
      .eq("code", code)
      .maybeSingle()

    if (error) {
      if ((error as { code?: string })?.code === "42P01") {
        return NextResponse.json(
          { valid: false, error: "Invite codes are not set up yet. Contact the event organizer." },
          { status: 503 }
        )
      }
      console.error("[national-team/validate-invite]", error)
      return NextResponse.json({ valid: false, error: "Could not validate code." }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ valid: false, error: "Invalid or expired invite code." }, { status: 200 })
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This invite code has expired." }, { status: 200 })
    }

    const usesCount = Number(row.uses_count) ?? 0
    const maxUses = row.max_uses != null ? Number(row.max_uses) : null
    if (maxUses != null && usesCount >= maxUses) {
      return NextResponse.json({ valid: false, error: "This invite code has reached its maximum uses." }, { status: 200 })
    }

    return NextResponse.json({ valid: true, eventSlug })
  } catch (e) {
    console.error("[national-team/validate-invite]", e)
    return NextResponse.json({ valid: false, error: "Something went wrong." }, { status: 500 })
  }
}
