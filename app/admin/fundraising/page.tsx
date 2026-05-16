import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildFundraisingHubSnapshot, type FundraisingHubActivityRow } from "@/lib/fundraising/hub-data"
import { FundraisingCommandCenter } from "./command-center"

export const dynamic = "force-dynamic"

type ExpenseRow = {
  id: string
  amount_cents: number
  status: string
  expense_type: string | null
  created_at: string
  paid_at: string | null
  athlete_id: string
  athlete_first_name: string | null
  athlete_last_name: string | null
  parent_email: string | null
  parent_name: string | null
}

type ActivationRequest = {
  id: string
  fundraising_slug: string
  status: string
  created_at: string
  requester_email: string | null
  athlete_first_name: string | null
  athlete_last_name: string | null
}

type ActiveProfile = {
  id: string
  slug: string
  athlete_id: string
  athlete_first_name: string | null
  athlete_last_name: string | null
  total_raised_cents: number
  campaign_goal_cents: number
  checkout_live: boolean
}

async function getFundraisingData() {
  const admin = createAdminClient()
  
  // Use the SAME data source as the public giving hub for donations
  const hubSnapshot = await buildFundraisingHubSnapshot()
  
  // Get detailed expense data with athlete info
  const { data: expenses, error: expenseErr } = await admin
    .from("athlete_expense_requests")
    .select(`
      id,
      amount_cents,
      status,
      expense_type,
      created_at,
      paid_at,
      athlete_id,
      user_id,
      athletes(firstName, lastName)
    `)
    .order("created_at", { ascending: false })
  
  if (expenseErr) {
    console.error("[v0] Expense query error:", expenseErr.message)
  }
  
  // Get user profiles for parent info (separate query since no FK)
  const userIds = [...new Set((expenses || []).map((e: any) => e.user_id).filter(Boolean))]
  const { data: userProfiles } = userIds.length > 0 
    ? await admin.from("user_profiles").select("user_id, full_name, email").in("user_id", userIds)
    : { data: [] }
  
  const userProfileMap = new Map((userProfiles || []).map((u: any) => [u.user_id, u]))
  
  // Get activation requests with athlete info
  const { data: activationRequests } = await admin
    .from("fundraising_activation_requests")
    .select(`
      id,
      fundraising_slug,
      status,
      created_at,
      requester_email,
      athletes(firstName, lastName)
    `)
    .order("created_at", { ascending: false })
  
  // Get active fundraising profiles
  const { data: activeProfiles } = await admin
    .from("athlete_fundraising_profiles")
    .select(`
      id,
      slug,
      athlete_id,
      total_raised_cents,
      campaign_goal_cents,
      checkout_live,
      athletes(firstName, lastName)
    `)
    .eq("is_active", true)
    .order("total_raised_cents", { ascending: false })
  
  // Get parent-athlete connection stats
  const { count: linkedAthletesCount } = await admin
    .from("parent_athlete_links")
    .select("athlete_id", { count: "exact", head: true })
  
  // Get total active profiles for comparison
  const { count: totalActiveProfiles } = await admin
    .from("athlete_fundraising_profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
  
  // Get page view stats for athlete pages (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: pageViews } = await admin
    .from("user_analytics")
    .select("page_url")
    .eq("event_type", "page_view")
    .like("page_url", "%/fundraising/athletes/%")
    .gte("created_at", thirtyDaysAgo.toISOString())
  
  // Get campaign breakdown from donations_unified (SOURCE OF TRUTH)
  // athlete_code present = Athlete Page donation
  // athlete_code null/empty = Spartan General donation
  const { data: unifiedDonations } = await admin
    .from("donations_unified")
    .select("amount_cents, athlete_code")
    .eq("is_paid", true)
  
  const campaignBreakdown = {
    spartanGeneral: { count: 0, totalCents: 0 },
    athletePages: { count: 0, totalCents: 0 }
  }
  
  unifiedDonations?.forEach((d: { amount_cents: number; athlete_code: string | null }) => {
    if (d.athlete_code && d.athlete_code.trim() !== "") {
      campaignBreakdown.athletePages.count++
      campaignBreakdown.athletePages.totalCents += d.amount_cents || 0
    } else {
      campaignBreakdown.spartanGeneral.count++
      campaignBreakdown.spartanGeneral.totalCents += d.amount_cents || 0
    }
  })
  
  // Get NC United Fund data (scholarship donations, awards, guild allocations)
  const { data: scholarshipDonations } = await admin
    .from("scholarship_donations")
    .select("amount_cents")
  
  const { data: scholarshipAwards } = await admin
    .from("scholarship_awards")
    .select("award_amount_cents")
  
  const { data: guildAllocations } = await admin
    .from("guild_credit_allocations")
    .select("amount_cents")
    .eq("status", "confirmed")
  
  const ncUnitedFund = {
    donationsCents: scholarshipDonations?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0,
    donationsCount: scholarshipDonations?.length || 0,
    awardsCents: scholarshipAwards?.reduce((sum, a) => sum + (a.award_amount_cents || 0), 0) || 0,
    awardsCount: scholarshipAwards?.length || 0,
    guildCents: guildAllocations?.reduce((sum, g) => sum + (g.amount_cents || 0), 0) || 0,
    guildCount: guildAllocations?.length || 0,
  }
  // Delta = donations - awards - guild allocations (available in fund)
  const fundDelta = ncUnitedFund.donationsCents - ncUnitedFund.awardsCents - ncUnitedFund.guildCents
  
  // Transform expenses
  const expenseRows: ExpenseRow[] = (expenses || []).map((e: any) => {
    const userProfile = userProfileMap.get(e.user_id)
    return {
      id: e.id,
      amount_cents: e.amount_cents || 0,
      status: e.status,
      expense_type: e.expense_type,
      created_at: e.created_at,
      paid_at: e.paid_at,
      athlete_id: e.athlete_id,
      athlete_first_name: e.athletes?.firstName || null,
      athlete_last_name: e.athletes?.lastName || null,
      parent_email: userProfile?.email || null,
      parent_name: userProfile?.full_name || null,
    }
  })
  
  // Transform activation requests
  const requestRows: ActivationRequest[] = (activationRequests || []).map((r: any) => ({
    id: r.id,
    fundraising_slug: r.fundraising_slug,
    status: r.status,
    created_at: r.created_at,
    requester_email: r.requester_email,
    athlete_first_name: r.athletes?.firstName || null,
    athlete_last_name: r.athletes?.lastName || null,
  }))
  
  // Transform active profiles
  const profileRows: ActiveProfile[] = (activeProfiles || []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    athlete_id: p.athlete_id,
    athlete_first_name: p.athletes?.firstName || null,
    athlete_last_name: p.athletes?.lastName || null,
    total_raised_cents: p.total_raised_cents || 0,
    campaign_goal_cents: p.campaign_goal_cents || 0,
    checkout_live: p.checkout_live,
  }))
  
  // Calculate totals
  const totalRaised = hubSnapshot.hero.totalRaisedCents
  const donationCount = hubSnapshot.hero.giftCount
  const paidExpenses = expenseRows.filter(e => e.status === "paid")
  const totalReimbursed = paidExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const pendingRequests = requestRows.filter(r => r.status === "pending")
  const activeProfileCount = profileRows.length
  
  // Count page views per slug
  const pageViewsMap: Record<string, number> = {}
  pageViews?.forEach((pv: any) => {
    const match = pv.page_url?.match(/\/fundraising\/athletes\/([^/?]+)/)
    if (match) {
      const slug = match[1]
      pageViewsMap[slug] = (pageViewsMap[slug] || 0) + 1
    }
  })
  
  // Add page views to profiles
  const profilesWithViews = profileRows.map(p => ({
    ...p,
    page_views_30d: pageViewsMap[p.slug] || 0
  }))

  return {
    totalRaised,
    donationCount,
    totalReimbursed,
    reimbursementCount: paidExpenses.length,
    pendingRequestCount: pendingRequests.length,
    activeProfileCount,
    linkedAthletesCount: linkedAthletesCount || 0,
    totalPageViews: pageViews?.length || 0,
    campaignBreakdown,
    ncUnitedFund: { ...ncUnitedFund, deltaCents: fundDelta },
    donations: hubSnapshot.activity,
    expenses: expenseRows,
    activationRequests: requestRows,
    activeProfiles: profilesWithViews,
  }
}

export default async function FundraisingAdminPage() {
  const data = await getFundraisingData()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NC United Branded Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#004080] text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="h-10 w-10 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="text-4xl font-bold">Fundraising Command Center</h1>
              </div>
              <p className="text-blue-200 text-lg">NC United - Donations, Reimbursements & Athlete Pages</p>
            </div>
            <Link href="/admin" className="bg-white text-[#003366] hover:bg-gray-100 px-4 py-2 rounded-md font-semibold">
              Back to Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <FundraisingCommandCenter 
          totalRaised={data.totalRaised}
          donationCount={data.donationCount}
          totalReimbursed={data.totalReimbursed}
          reimbursementCount={data.reimbursementCount}
          pendingRequestCount={data.pendingRequestCount}
          activeProfileCount={data.activeProfileCount}
          linkedAthletesCount={data.linkedAthletesCount}
          totalPageViews={data.totalPageViews}
          campaignBreakdown={data.campaignBreakdown}
          ncUnitedFund={data.ncUnitedFund}
          donations={data.donations}
          expenses={data.expenses}
          activationRequests={data.activationRequests}
          activeProfiles={data.activeProfiles}
        />
      </div>
    </div>
  )
}
