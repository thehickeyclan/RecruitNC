import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const { searchParams } = new URL(request.url)
  const athleteId = searchParams.get("athleteId")

  if (!athleteId) {
    return NextResponse.json({ error: "athleteId required" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get athlete info
  const { data: athlete } = await admin
    .from("athletes")
    .select("id, firstName, lastName, gradYear, highschool, claimed_by_user_id")
    .eq("id", athleteId)
    .single()

  if (!athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
  }

  // Get fundraising profile
  const { data: profile } = await admin
    .from("athlete_fundraising_profiles")
    .select("id, slug, is_active, checkout_live, total_raised_cents, campaign_goal_cents, primary_fundraising_code")
    .eq("athlete_id", athleteId)
    .single()

  // Get parent links
  const { data: parentLinks } = await admin
    .from("parent_athlete_links")
    .select(`
      user_id,
      users!parent_athlete_links_user_id_fkey(id, email, full_name)
    `)
    .eq("athlete_id", athleteId)

  // Get donations for this athlete (from spartan_donations)
  const { data: donations } = await admin
    .from("spartan_donations")
    .select("id, amount_cents, donor_name, donor_email, created_at, message")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(20)

  // Get expense requests for this athlete
  const { data: expenses } = await admin
    .from("athlete_expense_requests")
    .select("id, amount_cents, category, description, status, created_at, paid_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(20)

  // Calculate totals
  const totalRaised = donations?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0
  const paidExpenses = expenses?.filter(e => e.status === "paid") || []
  const totalSpent = paidExpenses.reduce((sum, e) => sum + (e.amount_cents || 0), 0)
  const pendingExpenses = expenses?.filter(e => e.status === "pending") || []
  const pendingAmount = pendingExpenses.reduce((sum, e) => sum + (e.amount_cents || 0), 0)
  const available = totalRaised - totalSpent

  // Get the parent user info (if linked)
  const parentUser = parentLinks?.[0]?.users as { id: string; email: string; full_name: string | null } | undefined

  return NextResponse.json({
    athlete: {
      id: athlete.id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      gradYear: athlete.gradYear,
      highschool: athlete.highschool,
      claimedByUserId: athlete.claimed_by_user_id,
    },
    profile: profile ? {
      slug: profile.slug,
      isActive: profile.is_active,
      checkoutLive: profile.checkout_live,
      goalCents: profile.campaign_goal_cents,
      fundraisingCode: profile.primary_fundraising_code,
    } : null,
    parent: parentUser ? {
      id: parentUser.id,
      email: parentUser.email,
      name: parentUser.full_name,
    } : null,
    hasParentLink: (parentLinks?.length || 0) > 0,
    wallet: {
      totalRaisedCents: totalRaised,
      totalSpentCents: totalSpent,
      availableCents: available,
      pendingExpensesCents: pendingAmount,
      giftCount: donations?.length || 0,
      expenseCount: paidExpenses.length,
      pendingExpenseCount: pendingExpenses.length,
    },
    recentDonations: donations?.slice(0, 5).map(d => ({
      id: d.id,
      amountCents: d.amount_cents,
      donorName: d.donor_name,
      donorEmail: d.donor_email,
      message: d.message,
      createdAt: d.created_at,
    })) || [],
    recentExpenses: expenses?.slice(0, 5).map(e => ({
      id: e.id,
      amountCents: e.amount_cents,
      category: e.category,
      description: e.description,
      status: e.status,
      createdAt: e.created_at,
      paidAt: e.paid_at,
    })) || [],
  })
}
