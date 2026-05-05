import type { SupabaseClient } from "@supabase/supabase-js"
import { FUNDRAISING_CAMPAIGNS, hubSpartanDonationRowMatchesCampaign } from "@/lib/fundraising/campaign-registry"

const DONATION_PAGE = 900

const ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type FundraisingAthleteMatrixCampaign = {
  stripeCampaignSlug: string
  tabLabel: string
}

export type FundraisingAthleteMatrixRow = {
  code: string
  rosterFirstName: string
  rosterLastName: string
  gradYear: number | null
  school: string | null
  /** `spartan_fundraising_athletes.athlete_id` when valid UUID */
  pinnedAthleteId: string | null
  /** RecruitNC directory pin — credits roll up to Profile → Fundraise */
  rosterPinOk: boolean
  /** Active donor page `/fundraising/athletes/{slug}` for pinned athlete */
  donorPageOk: boolean
  donorProfileSlug: string | null
  donorProfileActive: boolean
  /** At least one parent link or profile athlete match */
  parentLinkCount: number
  parentOk: boolean
  /** NCU on profile matches roster code (sanity) */
  primaryCodeMatchesRoster: boolean | null
  /** When profile has `primary_fundraising_code`, matches roster; null if N/A */
  codeSyncOk: boolean | null
  /** Registry `stripeCampaignSlug` values with ≥1 paid gift credited to this NCU code (mirror ledger). */
  campaignActivitySlugs: string[]
}

export type FundraisingAthleteMatrixPayload = {
  rows: FundraisingAthleteMatrixRow[]
  campaigns: FundraisingAthleteMatrixCampaign[]
  generatedAt: string
}

type RosterRow = {
  code: string | null
  first_name: string | null
  last_name: string | null
  grad_year: number | null
  school: string | null
  active: boolean | null
  athlete_id?: string | null
}

function normCode(c: string): string {
  return c.trim().toUpperCase()
}

async function fetchCodeCampaignActivity(admin: SupabaseClient): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  let from = 0
  for (;;) {
    const { data, error } = await admin
      .from("spartan_donations")
      .select("athlete_code, spartan_campaign")
      .eq("status", "paid")
      .not("athlete_code", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + DONATION_PAGE - 1)

    if (error) {
      if (error.code !== "42P01") {
        console.error("[fundraising-athlete-matrix] spartan_donations campaign scan", error.message)
      }
      break
    }

    const batch = (data ?? []) as { athlete_code: string | null; spartan_campaign: string | null }[]
    for (const row of batch) {
      const raw = row.athlete_code?.trim()
      if (!raw) continue
      const code = normCode(raw)
      for (const c of FUNDRAISING_CAMPAIGNS) {
        if (!hubSpartanDonationRowMatchesCampaign(row.spartan_campaign, c)) continue
        let set = map.get(code)
        if (!set) {
          set = new Set()
          map.set(code, set)
        }
        set.add(c.stripeCampaignSlug)
      }
    }
    if (batch.length < DONATION_PAGE) break
    from += DONATION_PAGE
  }
  return map
}

/**
 * One operational view: roster NCU codes × pin × donor profile × parent managers.
 * Campaign participation for Stripe-driven drives uses registry slugs on checkout metadata — when `rosterPinOk`,
 * gifts credited to this code roll up to that RecruitNC athlete for parent wallet UX.
 */
export async function buildFundraisingAthleteMatrix(admin: SupabaseClient): Promise<FundraisingAthleteMatrixPayload> {
  let rosterRes = await admin
    .from("spartan_fundraising_athletes")
    .select("code, first_name, last_name, grad_year, school, active, athlete_id")
    .eq("active", true)

  if (rosterRes.error && /athlete_id|schema cache/i.test(rosterRes.error.message)) {
    rosterRes = await admin
      .from("spartan_fundraising_athletes")
      .select("code, first_name, last_name, grad_year, school, active")
      .eq("active", true)
  }

  if (rosterRes.error) {
    console.error("[fundraising-athlete-matrix] roster", rosterRes.error.message)
    throw new Error(rosterRes.error.message)
  }

  const rosterRows = (rosterRes.data ?? []) as RosterRow[]
  const rosterFiltered = rosterRows.filter((r) => typeof r.code === "string" && r.code.trim())

  const { data: profileRows, error: profileErr } = await admin
    .from("athlete_fundraising_profiles")
    .select("athlete_id, slug, is_active, primary_fundraising_code")

  if (profileErr) {
    console.error("[fundraising-athlete-matrix] profiles", profileErr.message)
    throw new Error(profileErr.message)
  }

  type ProfileLite = {
    athlete_id: string
    slug: string
    is_active: boolean
    primary_fundraising_code: string | null
  }

  const profiles: ProfileLite[] = (profileRows ?? []).map((p: Record<string, unknown>) => ({
    athlete_id: String(p.athlete_id ?? ""),
    slug: String(p.slug ?? ""),
    is_active: p.is_active === true,
    primary_fundraising_code: typeof p.primary_fundraising_code === "string" ? p.primary_fundraising_code : null,
  }))

  const profilesByAthleteId = new Map<string, ProfileLite[]>()
  for (const pr of profiles) {
    if (!pr.athlete_id || !ATHLETE_UUID_RE.test(pr.athlete_id)) continue
    const list = profilesByAthleteId.get(pr.athlete_id) ?? []
    list.push(pr)
    profilesByAthleteId.set(pr.athlete_id, list)
  }

  const pinnedIds = new Set<string>()
  for (const r of rosterFiltered) {
    const aid = typeof r.athlete_id === "string" ? r.athlete_id.trim() : ""
    if (aid && ATHLETE_UUID_RE.test(aid)) pinnedIds.add(aid)
  }

  const campaignActivityByCode = await fetchCodeCampaignActivity(admin)

  const managerCountByAthlete = new Map<string, number>()
  if (pinnedIds.size > 0) {
    const idList = [...pinnedIds]
    const managers = new Map<string, Set<string>>()
    for (const id of idList) managers.set(id, new Set())

    const { data: links, error: linkErr } = await admin
      .from("parent_athlete_links")
      .select("athlete_id, user_id")
      .in("athlete_id", idList)
    if (linkErr && linkErr.code !== "42P01") {
      console.error("[fundraising-athlete-matrix] parent_athlete_links", linkErr.message)
    } else {
      for (const row of links ?? []) {
        const a = (row as { athlete_id?: string; user_id?: string }).athlete_id
        const u = (row as { athlete_id?: string; user_id?: string }).user_id
        if (a && u && managers.has(a)) managers.get(a)!.add(u)
      }
    }

    const { data: selfProfiles, error: spErr } = await admin
      .from("user_profiles")
      .select("user_id, athlete_id")
      .in("athlete_id", idList)
    if (spErr) {
      console.error("[fundraising-athlete-matrix] user_profiles", spErr.message)
    } else {
      for (const row of selfProfiles ?? []) {
        const a = (row as { athlete_id?: string | null; user_id?: string }).athlete_id
        const u = (row as { athlete_id?: string | null; user_id?: string }).user_id
        if (a && u && managers.has(a)) managers.get(a)!.add(u)
      }
    }

    for (const [id, set] of managers) {
      managerCountByAthlete.set(id, set.size)
    }
  }

  const rows: FundraisingAthleteMatrixRow[] = rosterFiltered
    .map((r) => {
      const code = normCode(String(r.code ?? ""))
      const pinnedRaw = typeof r.athlete_id === "string" ? r.athlete_id.trim() : ""
      const pinnedAthleteId = ATHLETE_UUID_RE.test(pinnedRaw) ? pinnedRaw : null
      const rosterPinOk = pinnedAthleteId != null

      const profList = pinnedAthleteId ? profilesByAthleteId.get(pinnedAthleteId) ?? [] : []
      const activeProf = profList.find((p) => p.is_active && p.slug.trim()) ?? profList.find((p) => p.slug.trim()) ?? null

      let donorProfileSlug = activeProf?.slug.trim() ?? null
      let donorProfileActive = activeProf?.is_active ?? false
      let donorPageOk = Boolean(activeProf?.is_active && activeProf.slug.trim())
      let primaryCodeMatchesRoster: boolean | null = null

      if (activeProf?.primary_fundraising_code?.trim()) {
        primaryCodeMatchesRoster = normCode(activeProf.primary_fundraising_code) === code
      }

      const hasPrimaryCode = Boolean(activeProf?.primary_fundraising_code?.trim())
      const codeSyncOk: boolean | null =
        rosterPinOk && hasPrimaryCode ? primaryCodeMatchesRoster === true : null

      const parentLinkCount = pinnedAthleteId ? managerCountByAthlete.get(pinnedAthleteId) ?? 0 : 0
      const parentOk = rosterPinOk && parentLinkCount > 0

      const campaignActivitySlugs = [...(campaignActivityByCode.get(code) ?? [])].sort((a, b) =>
        a.localeCompare(b),
      )

      return {
        code,
        rosterFirstName: (r.first_name ?? "").trim(),
        rosterLastName: (r.last_name ?? "").trim(),
        gradYear: typeof r.grad_year === "number" && Number.isFinite(r.grad_year) ? r.grad_year : null,
        school: typeof r.school === "string" ? r.school.trim() : null,
        pinnedAthleteId,
        rosterPinOk,
        donorPageOk,
        donorProfileSlug,
        donorProfileActive,
        parentLinkCount,
        parentOk,
        primaryCodeMatchesRoster,
        codeSyncOk,
        campaignActivitySlugs,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

  return {
    rows,
    campaigns: FUNDRAISING_CAMPAIGNS.map((c) => ({
      stripeCampaignSlug: c.stripeCampaignSlug,
      tabLabel: c.tabLabel,
    })),
    generatedAt: new Date().toISOString(),
  }
}

export function matrixRowDisplayName(r: FundraisingAthleteMatrixRow): string {
  const fn = r.rosterFirstName
  const ln = r.rosterLastName
  return [fn, ln].filter(Boolean).join(" ") || ln || fn || "—"
}
