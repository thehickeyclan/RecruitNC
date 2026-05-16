import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const supabase = await createClient()

  try {
    // Get all athletes with fundraising profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("athlete_fundraising_profiles")
      .select(`
        id,
        athlete_id,
        slug,
        is_active,
        checkout_live,
        primary_fundraising_code,
        total_raised_cents
      `)

    if (profilesError) throw profilesError

    // Get athlete details
    const athleteIds = profiles?.map((p) => p.athlete_id) || []
    const { data: athletes } = await supabase
      .from("athletes")
      .select("id, name")
      .in("id", athleteIds)

    const athleteMap = (athletes || []).reduce((acc, a) => {
      acc[a.id] = a.name
      return acc
    }, {} as Record<string, string>)

    // Get parent links
    const { data: parentLinks } = await supabase
      .from("parent_athlete_links")
      .select("athlete_id, user_id")
      .in("athlete_id", athleteIds)

    const parentLinksMap = (parentLinks || []).reduce((acc, link) => {
      acc[link.athlete_id] = link.user_id
      return acc
    }, {} as Record<string, string>)

    // Get user emails for parents
    const userIds = Object.values(parentLinksMap)
    let userEmailsMap: Record<string, { email: string; name: string | null }> = {}
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email, display_name")
        .in("id", userIds)

      userEmailsMap = (users || []).reduce((acc, u) => {
        acc[u.id] = { email: u.email, name: u.display_name }
        return acc
      }, {} as Record<string, { email: string; name: string | null }>)
    }

    // Get donations by athlete code
    const codes = profiles?.map((p) => p.primary_fundraising_code).filter(Boolean) || []
    let donationsByCode: Record<string, { cents: number; count: number }> = {}

    if (codes.length > 0) {
      const { data: donations } = await supabase
        .from("spartan_donations")
        .select("athlete_code, amount_cents")
        .in("athlete_code", codes)

      donationsByCode = (donations || []).reduce((acc, d) => {
        const code = d.athlete_code
        if (!code) return acc
        if (!acc[code]) acc[code] = { cents: 0, count: 0 }
        acc[code].cents += d.amount_cents || 0
        acc[code].count += 1
        return acc
      }, {} as Record<string, { cents: number; count: number }>)
    }

    // Get reimbursements by athlete
    const { data: reimbursements } = await supabase
      .from("expense_requests")
      .select("athlete_id, amount_approved_cents, status")
      .in("athlete_id", athleteIds)
      .eq("status", "paid")

    const reimbursementsByAthlete = (reimbursements || []).reduce((acc, r) => {
      if (!acc[r.athlete_id]) acc[r.athlete_id] = 0
      acc[r.athlete_id] += r.amount_approved_cents || 0
      return acc
    }, {} as Record<string, number>)

    // Build wallet data
    const wallets = (profiles || []).map((profile) => {
      const code = profile.primary_fundraising_code
      const donations = code ? donationsByCode[code] : null
      const raisedCents = donations?.cents || profile.total_raised_cents || 0
      const reimbursedCents = reimbursementsByAthlete[profile.athlete_id] || 0
      const guildAllocationsCents = 0 // Could be expanded later
      const parentUserId = parentLinksMap[profile.athlete_id]
      const parentInfo = parentUserId ? userEmailsMap[parentUserId] : null

      return {
        athleteId: profile.athlete_id,
        athleteName: athleteMap[profile.athlete_id] || "Unknown",
        athleteCode: profile.primary_fundraising_code,
        parentEmail: parentInfo?.email || null,
        parentName: parentInfo?.name || null,
        raisedCents,
        reimbursedCents,
        guildAllocationsCents,
        availableCents: raisedCents - reimbursedCents - guildAllocationsCents,
        donationCount: donations?.count || 0,
        hasParentLink: !!parentUserId,
        profileActive: profile.is_active && profile.checkout_live,
      }
    })

    // Sort by available balance descending
    wallets.sort((a, b) => b.availableCents - a.availableCents)

    return NextResponse.json({ wallets })
  } catch (error) {
    console.error("Wallets error:", error)
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 })
  }
}
