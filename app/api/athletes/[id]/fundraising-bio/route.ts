import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

import { userCanManageFundraisingForAthlete } from "@/lib/fundraising/athlete-fundraising-access"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { normalizeFundraisingProfileSlug } from "@/lib/fundraising/athlete-fundraising-profiles"
import { fundraisingSlugFromCode } from "@/lib/fundraising/athlete-fundraising-slug"

const MAX_BIO = 6000
/** Minimum campaign goal when set (cents) — $50 */
const MIN_CAMPAIGN_GOAL_CENTS = 50 * 100
const MAX_CAMPAIGN_GOAL_CENTS = 500_000 * 100
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

    let body: { bio?: unknown; campaign_goal_cents?: unknown } = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const hasBioKey = Object.prototype.hasOwnProperty.call(body, "bio")
    const hasGoalKey = Object.prototype.hasOwnProperty.call(body, "campaign_goal_cents")
    if (!hasBioKey && !hasGoalKey) {
      return NextResponse.json({ error: "Provide bio and/or campaign_goal_cents" }, { status: 400 })
    }

    let nextBio: string | null | undefined = undefined
    if (hasBioKey) {
      const rawBio = body.bio
      if (typeof rawBio !== "string") {
        return NextResponse.json({ error: "bio must be a string" }, { status: 400 })
      }
      nextBio = rawBio.trim().slice(0, MAX_BIO) || null
    }

    let nextGoalCents: number | null | undefined = undefined
    if (hasGoalKey) {
      const g = body.campaign_goal_cents
      if (g === null) {
        nextGoalCents = null
      } else if (typeof g === "number" && Number.isFinite(g)) {
        const cents = Math.round(g)
        if (!Number.isSafeInteger(cents) || cents < 0) {
          return NextResponse.json({ error: "campaign_goal_cents must be a non-negative integer (or null)" }, { status: 400 })
        }
        if (cents === 0) {
          nextGoalCents = null
        } else if (cents < MIN_CAMPAIGN_GOAL_CENTS) {
          return NextResponse.json(
            { error: `Campaign goal must be at least $${MIN_CAMPAIGN_GOAL_CENTS / 100}` },
            { status: 400 },
          )
        } else if (cents > MAX_CAMPAIGN_GOAL_CENTS) {
          return NextResponse.json({ error: "Campaign goal is too large" }, { status: 400 })
        } else {
          nextGoalCents = cents
        }
      } else {
        return NextResponse.json({ error: "campaign_goal_cents must be a number or null" }, { status: 400 })
      }
    }

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
      .select("id, athlete_id, slug, bio, campaign_goal_cents")
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

      const bioForInsert = nextBio !== undefined ? nextBio : null
      const goalForInsert = nextGoalCents !== undefined ? nextGoalCents : null
      const hasPageContent =
        (bioForInsert != null && bioForInsert.length > 0) || (goalForInsert != null && goalForInsert > 0)
      if (!hasPageContent) {
        return NextResponse.json(
          { error: "Add a note or a fundraising goal to create your gift page the first time." },
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
          bio: bioForInsert,
          photo_url: null,
          is_active: true,
          campaign_goal_cents: goalForInsert,
          primary_fundraising_code: primary,
          updated_at: now,
        })
        .select("id, slug, bio, campaign_goal_cents, updated_at")
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

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (nextBio !== undefined) patch.bio = nextBio
    if (nextGoalCents !== undefined) patch.campaign_goal_cents = nextGoalCents

    const { data: updated, error: uErr } = await admin
      .from("athlete_fundraising_profiles")
      .update(patch)
      .eq("id", profile.id)
      .select("id, slug, bio, campaign_goal_cents, updated_at")
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
