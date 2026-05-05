import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { normalizeFundraisingProfileSlug } from "@/lib/fundraising/athlete-fundraising-profiles"
import { fundraisingSlugFromCode } from "@/lib/fundraising/athlete-fundraising-slug"

const MAX_BIO = 6000
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const NCU_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

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
      /** Same auto-create path staff used to have only — now any athlete/parent who already passes userCanManageFundraisingForAthlete. */
      const entries = await getFundraisingAthleteEntries(admin)
      const entry = entries.find((e) => e.id === athleteId)
      const fromCode = entry?.code?.trim() ? normalizeFundraisingProfileSlug(fundraisingSlugFromCode(entry.code)) : ""
      const slug = fromCode && SLUG_RE.test(fromCode) ? fromCode : ""

      if (!slug) {
        return NextResponse.json(
          {
            error:
              "Cannot create a fundraising profile automatically: this athlete needs an NCU roster code. Create a profile in admin Fundraising or add the athlete to the fundraising roster first.",
          },
          { status: 400 },
        )
      }

      const primary =
        entry?.code?.trim() && NCU_RE.test(entry.code.trim().toUpperCase())
          ? entry.code.trim().toUpperCase()
          : null

      const now = new Date().toISOString()
      const { data: created, error: insErr } = await admin
        .from("athlete_fundraising_profiles")
        .insert({
          athlete_id: athleteId,
          slug,
          bio,
          photo_url: null,
          is_active: true,
          campaign_goal_cents: null,
          primary_fundraising_code: primary,
          updated_at: now,
        })
        .select("id, slug, bio, updated_at")
        .single()

      if (insErr) {
        console.error("[fundraising-bio] admin create profile", insErr.message)
        if (insErr.code === "23505") {
          return NextResponse.json(
            { error: "That slug is already taken — add this athlete’s profile in admin Fundraising with a unique slug." },
            { status: 409 },
          )
        }
        return NextResponse.json({ error: "Could not create fundraising profile" }, { status: 500 })
      }

      return NextResponse.json({ success: true, profile: created })
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
