import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSession } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

interface AthleteIssue {
  athlete_id: string
  athlete_name: string
  school: string | null
  grad_year: number | null
  issues: {
    type: string
    severity: "critical" | "warning" | "info"
    message: string
  }[]
  total_raised_cents: number
  has_page: boolean
  page_active: boolean
  has_family: boolean
  has_parent: boolean
  spartan_code: string | null
  page_slug: string | null
}

export async function GET() {
  const adminCheck = await verifyAdminSession()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  
  try {
    // Step 1: Get all athletes with fundraising profiles
    const { data: profileAthletes, error: profileError } = await supabase
      .from("athlete_fundraising_profiles")
      .select(`
        athlete_id,
        slug,
        spartan_code,
        total_raised_cents,
        is_active,
        primary_fundraising_code
      `)
    
    if (profileError) {
      console.error("[v0] Error fetching fundraising profiles:", profileError)
    }

    // Step 2: Get all spartan fundraising athletes
    const { data: spartanAthletes, error: spartanError } = await supabase
      .from("spartan_fundraising_athletes")
      .select("athlete_id, code, first_name, last_name, school, grad_year")
    
    if (spartanError) {
      console.error("[v0] Error fetching spartan athletes:", spartanError)
    }

    // Step 3: Get ledger totals grouped by athlete
    const { data: ledgerData, error: ledgerError } = await supabase
      .from("fundraising_ledger_entries")
      .select("athlete_id, amount_cents, direction")
      .not("athlete_id", "is", null)
    
    if (ledgerError) {
      console.error("[v0] Error fetching ledger entries:", ledgerError)
    }

    // Step 4: Get family athlete links
    const { data: familyAthleteLinks, error: familyError } = await supabase
      .from("family_athletes")
      .select("athlete_id, family_id")
    
    if (familyError) {
      console.error("[v0] Error fetching family athletes:", familyError)
    }

    // Step 5: Get family members (to check if parents are linked)
    const { data: familyMembers, error: membersError } = await supabase
      .from("family_members")
      .select("family_id, user_id")
    
    if (membersError) {
      console.error("[v0] Error fetching family members:", membersError)
    }

    // Build lookup maps
    const profileMap = new Map(profileAthletes?.map(p => [p.athlete_id, p]) || [])
    const spartanMap = new Map(spartanAthletes?.map(s => [s.athlete_id, s]) || [])
    const familyAthleteMap = new Map(familyAthleteLinks?.map(fa => [fa.athlete_id, fa.family_id]) || [])
    const familyMemberCounts = new Map<string, number>()
    familyMembers?.forEach(fm => {
      const count = familyMemberCounts.get(fm.family_id) || 0
      familyMemberCounts.set(fm.family_id, count + 1)
    })

    // Calculate ledger totals per athlete
    const athleteLedgerTotals = new Map<string, number>()
    ledgerData?.forEach(entry => {
      if (entry.athlete_id && entry.direction === "in") {
        const current = athleteLedgerTotals.get(entry.athlete_id) || 0
        athleteLedgerTotals.set(entry.athlete_id, current + (entry.amount_cents || 0))
      }
    })

    // Collect all unique athlete IDs with any fundraising activity
    const athleteIdsWithActivity = new Set<string>()
    profileAthletes?.forEach(p => {
      if (p.athlete_id) athleteIdsWithActivity.add(p.athlete_id)
    })
    spartanAthletes?.forEach(s => {
      if (s.athlete_id) athleteIdsWithActivity.add(s.athlete_id)
    })
    ledgerData?.forEach(l => {
      if (l.athlete_id) athleteIdsWithActivity.add(l.athlete_id)
    })

    console.log("[v0] Athletes with activity:", athleteIdsWithActivity.size)

    // Step 6: Fetch athlete details for all with activity
    const athleteIds = Array.from(athleteIdsWithActivity)
    
    if (athleteIds.length === 0) {
      return NextResponse.json({
        stats: {
          total_athletes_with_fundraising: 0,
          fully_connected: 0,
          needs_attention: 0,
          critical_issues: 0,
          total_raised_cents: 0
        },
        issues: []
      })
    }

    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select(`id, "firstName", "lastName", highschool, graduationyear`)
      .in("id", athleteIds)
    
    if (athletesError) {
      console.error("[v0] Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    console.log("[v0] Fetched athletes:", athletes?.length)

    // Analyze each athlete
    const issuesList: AthleteIssue[] = []
    let fullyConnected = 0
    let criticalCount = 0
    let totalRaisedAll = 0

    for (const athlete of athletes || []) {
      const profile = profileMap.get(athlete.id)
      const spartan = spartanMap.get(athlete.id)
      const familyId = familyAthleteMap.get(athlete.id)
      const parentCount = familyId ? (familyMemberCounts.get(familyId) || 0) : 0
      
      // Calculate total raised from multiple sources
      const profileRaised = profile?.total_raised_cents || 0
      const ledgerRaised = athleteLedgerTotals.get(athlete.id) || 0
      const totalRaised = Math.max(profileRaised, ledgerRaised)
      totalRaisedAll += totalRaised

      const issues: AthleteIssue["issues"] = []
      
      const hasPage = !!profile
      const pageActive = profile?.is_active ?? false
      const hasFamily = !!familyId
      const hasParent = parentCount > 0
      const hasSpartanCode = !!spartan?.code || !!profile?.spartan_code
      const hasAnyCode = hasSpartanCode || !!profile?.slug || !!profile?.primary_fundraising_code

      // Critical: Has donations but no family (money is stuck)
      if (totalRaised > 0 && !hasFamily) {
        issues.push({
          type: "has_donations_no_family",
          severity: "critical",
          message: `Has $${(totalRaised / 100).toLocaleString()} raised but no family to receive it`
        })
      }

      // Warning: No family assigned
      if (!hasFamily && totalRaised === 0) {
        issues.push({
          type: "no_family",
          severity: "warning",
          message: "No family assigned - wallet cannot be created"
        })
      }

      // Warning: No parent linked (has family but no members)
      if (hasFamily && !hasParent) {
        issues.push({
          type: "no_parent_linked",
          severity: "warning",
          message: "Family exists but no parent account linked"
        })
      }

      // Warning: No donation code
      if (!hasAnyCode) {
        issues.push({
          type: "no_code",
          severity: "warning",
          message: "No donation code assigned - cannot receive donations"
        })
      }

      // Info: Page inactive
      if (hasPage && !pageActive) {
        issues.push({
          type: "page_inactive",
          severity: "info",
          message: "Fundraising page exists but is not active"
        })
      }

      if (issues.length > 0) {
        const hasCritical = issues.some(i => i.severity === "critical")
        if (hasCritical) criticalCount++

        issuesList.push({
          athlete_id: athlete.id,
          athlete_name: `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim() || "Unknown",
          school: athlete.highschool || spartan?.school || null,
          grad_year: athlete.graduationyear || spartan?.grad_year || null,
          issues,
          total_raised_cents: totalRaised,
          has_page: hasPage,
          page_active: pageActive,
          has_family: hasFamily,
          has_parent: hasParent,
          spartan_code: spartan?.code || profile?.spartan_code || null,
          page_slug: profile?.slug || null
        })
      } else {
        fullyConnected++
      }
    }

    // Sort by severity (critical first) then by amount raised (highest first)
    issuesList.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      const aSeverity = Math.min(...a.issues.map(i => severityOrder[i.severity]))
      const bSeverity = Math.min(...b.issues.map(i => severityOrder[i.severity]))
      if (aSeverity !== bSeverity) return aSeverity - bSeverity
      return b.total_raised_cents - a.total_raised_cents
    })

    const needsAttention = issuesList.length

    console.log("[v0] Health check complete:", { fullyConnected, needsAttention, criticalCount })

    return NextResponse.json({
      stats: {
        total_athletes_with_fundraising: fullyConnected + needsAttention,
        fully_connected: fullyConnected,
        needs_attention: needsAttention,
        critical_issues: criticalCount,
        total_raised_cents: totalRaisedAll
      },
      issues: issuesList
    })
  } catch (error) {
    console.error("[v0] Health check error:", error)
    return NextResponse.json({ error: "Failed to run health check" }, { status: 500 })
  }
}
