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
    // Get all athletes with fundraising activity (either has a page, spartan code, or donations)
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select(`
        id,
        "firstName",
        "lastName",
        school,
        "graduationYear",
        athlete_fundraising_profiles (
          id,
          slug,
          spartan_code,
          total_raised_cents,
          is_active,
          primary_fundraising_code
        ),
        family_athletes (
          family_id,
          families (
            id,
            name,
            family_members (
              user_id,
              is_primary
            )
          )
        )
      `)
      .order("lastName", { ascending: true })
    
    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    // Also get spartan fundraising athletes (legacy system)
    const { data: spartanAthletes } = await supabase
      .from("spartan_fundraising_athletes")
      .select("athlete_id, code, total_raised_cents")
    
    const spartanMap = new Map(spartanAthletes?.map(s => [s.athlete_id, s]) || [])

    // Get ledger totals by athlete
    const { data: ledgerTotals } = await supabase
      .from("fundraising_ledger_entries")
      .select("athlete_id, amount_cents, direction")
    
    const athleteTotals = new Map<string, number>()
    ledgerTotals?.forEach(entry => {
      if (entry.athlete_id) {
        const current = athleteTotals.get(entry.athlete_id) || 0
        if (entry.direction === "in") {
          athleteTotals.set(entry.athlete_id, current + entry.amount_cents)
        }
      }
    })

    // Analyze each athlete
    const issuesList: AthleteIssue[] = []
    let fullyConnected = 0
    let needsAttention = 0
    let criticalCount = 0

    for (const athlete of athletes || []) {
      const profile = athlete.athlete_fundraising_profiles?.[0]
      const spartan = spartanMap.get(athlete.id)
      const familyLink = athlete.family_athletes?.[0]
      const family = familyLink?.families
      const familyMembers = family?.family_members || []
      
      // Calculate total raised from multiple sources
      const profileRaised = profile?.total_raised_cents || 0
      const spartanRaised = spartan?.total_raised_cents || 0
      const ledgerRaised = athleteTotals.get(athlete.id) || 0
      const totalRaised = Math.max(profileRaised, spartanRaised, ledgerRaised)
      
      // Skip athletes with no fundraising activity
      const hasPage = !!profile
      const hasSpartanCode = !!spartan?.code || !!profile?.spartan_code
      const hasAnyCode = hasSpartanCode || !!profile?.slug || !!profile?.primary_fundraising_code
      
      if (!hasPage && !hasSpartanCode && totalRaised === 0) {
        continue // No fundraising activity
      }

      const issues: AthleteIssue["issues"] = []
      
      const hasFamily = !!family
      const hasParent = familyMembers.length > 0
      const pageActive = profile?.is_active ?? false

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
        needsAttention++

        issuesList.push({
          athlete_id: athlete.id,
          athlete_name: `${athlete.firstName} ${athlete.lastName}`,
          school: athlete.school,
          grad_year: athlete.graduationYear,
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

    const totalWithFundraising = fullyConnected + needsAttention

    return NextResponse.json({
      stats: {
        total_athletes_with_fundraising: totalWithFundraising,
        fully_connected: fullyConnected,
        needs_attention: needsAttention,
        critical_issues: criticalCount,
        total_raised_cents: Array.from(athleteTotals.values()).reduce((a, b) => a + b, 0)
      },
      issues: issuesList
    })
  } catch (error) {
    console.error("Health check error:", error)
    return NextResponse.json({ error: "Failed to run health check" }, { status: 500 })
  }
}
