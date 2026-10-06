import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const supabase = await createClient()
  // Reads with the server key: the route is behind the admin gate (middleware), and donor rows are not readable by the signed-in role.
  const db = createAdminClient()

  try {
    // Get total raised from spartan donations
    const { data: spartanTotals } = await db
      .from("spartan_donations")
      .select("amount_cents")
    
    const totalRaisedCents = spartanTotals?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0

    // Get total spent from paid reimbursements
    const { data: paidReimbursements } = await db
      .from("expense_requests")
      .select("amount_approved_cents")
      .eq("status", "paid")
    
    const totalSpentCents = paidReimbursements?.reduce((sum, r) => sum + (r.amount_approved_cents || 0), 0) || 0

    // Get pending activations
    const { count: pendingActivations } = await db
      .from("athlete_fundraising_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false)
      .eq("checkout_live", false)

    // Get pending reimbursements
    const { count: pendingReimbursements } = await db
      .from("expense_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "under_review"])

    // Get active athlete pages
    const { count: activeAthletePages } = await db
      .from("athlete_fundraising_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("checkout_live", true)

    // Get total donation count
    const { count: totalDonations } = await db
      .from("spartan_donations")
      .select("id", { count: "exact", head: true })

    return NextResponse.json({
      totalRaised: Math.round(totalRaisedCents / 100),
      totalSpent: Math.round(totalSpentCents / 100),
      totalAvailable: Math.round((totalRaisedCents - totalSpentCents) / 100),
      totalDonations: totalDonations || 0,
      pendingActivations: pendingActivations || 0,
      pendingReimbursements: pendingReimbursements || 0,
      activeCampaigns: 0, // Could be expanded later
      activeAthletePages: activeAthletePages || 0,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
