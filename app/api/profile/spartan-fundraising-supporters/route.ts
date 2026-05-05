import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeParentSpartanFundraisingTotalsForUser } from "@/lib/parent-spartan-fundraising-totals"
import { getAthleteOwnerThankYouRows } from "@/lib/fundraising/athlete-public-stats"
import { FAYETTEVILLE_STRIPE_LOOKBACK_DAYS } from "@/lib/spartan-fayetteville-totals-by-code"
import { fundraisingSlugFromCode } from "@/lib/fundraising/athlete-fundraising-slug"

export const dynamic = "force-dynamic"

export type ProfileSpartanSupportersAthletePayload = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  codeUnavailable?: boolean
  giftPagePath: string | null
  rows: Awaited<ReturnType<typeof getAthleteOwnerThankYouRows>>
}

/**
 * GET: Per linked athlete, donor contact rows for thank-yous (same window as profile totals / public Spartan).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    const { athletes } = await computeParentSpartanFundraisingTotalsForUser(admin, user.id)
    const ids = athletes.map((a) => a.athleteId)
    const slugByAthleteId = new Map<string, string>()
    if (ids.length > 0) {
      const { data: profs, error: pErr } = await admin
        .from("athlete_fundraising_profiles")
        .select("athlete_id, slug")
        .in("athlete_id", ids)
        .eq("is_active", true)
      if (!pErr && profs) {
        for (const p of profs as { athlete_id?: string; slug?: string }[]) {
          const aid = typeof p.athlete_id === "string" ? p.athlete_id : ""
          const sl = typeof p.slug === "string" ? p.slug.trim() : ""
          if (aid && sl) slugByAthleteId.set(aid, sl)
        }
      }
    }

    const payload: ProfileSpartanSupportersAthletePayload[] = []
    for (const a of athletes) {
      const code = a.fundraisingCode
      const slug = slugByAthleteId.get(a.athleteId) ?? (code ? fundraisingSlugFromCode(code) : null)
      const giftPagePath = slug ? `/fundraising/athletes/${encodeURIComponent(slug)}` : null

      if (!code || a.codeUnavailable) {
        payload.push({
          athleteId: a.athleteId,
          name: a.name,
          fundraisingCode: code,
          codeUnavailable: a.codeUnavailable,
          giftPagePath,
          rows: [],
        })
        continue
      }

      const rows = await getAthleteOwnerThankYouRows(code)
      payload.push({
        athleteId: a.athleteId,
        name: a.name,
        fundraisingCode: code,
        giftPagePath,
        rows,
      })
    }

    return NextResponse.json({
      lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
      athletes: payload,
    })
  } catch (e) {
    console.error("[profile/spartan-fundraising-supporters]", e)
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 })
  }
}
