import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"

const MAX_BIO = 6000

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: athleteId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body: { bio?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const rawBio = body.bio
    if (typeof rawBio !== "string") {
      return NextResponse.json({ error: "bio must be a string" }, { status: 400 })
    }
    const bio = rawBio.trim().slice(0, MAX_BIO) || null

    const admin = createAdminClient()
    const { data: athlete, error: aErr } = await admin
      .from("athletes")
      .select("id")
      .eq("id", athleteId)
      .maybeSingle()

    if (aErr || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const allowed = await userCanManageFundraisingForAthlete(admin, user.id, athleteId)
    if (!allowed) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const { data: profile, error: pErr } = await admin
      .from("athlete_fundraising_profiles")
      .select("id, athlete_id, slug, bio")
      .eq("athlete_id", athleteId)
      .maybeSingle()

    if (pErr) {
      console.error("[fundraising-bio]", pErr.message)
      return NextResponse.json({ error: "Could not load fundraising page" }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json(
        { error: "No fundraising page on file for this athlete — contact NC United to add one." },
        { status: 404 },
      )
    }

    const { data: updated, error: uErr } = await admin
      .from("athlete_fundraising_profiles")
      .update({ bio, updated_at: new Date().toISOString() })
      .eq("id", profile.id)
      .select("id, slug, bio, updated_at")
      .single()

    if (uErr) {
      console.error("[fundraising-bio] update", uErr.message)
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: updated })
  } catch (e) {
    console.error("[fundraising-bio]", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
