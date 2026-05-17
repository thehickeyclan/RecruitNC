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
    .select("id, firstName, lastName, gradYear, highschool, claimed_by_user_id, fundraising_code")
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
    .maybeSingle()

  // Get parent links
  const { data: parentLinks } = await admin
    .from("parent_athlete_links")
    .select(`
      user_id,
      users!parent_athlete_links_user_id_fkey(id, email, full_name)
    `)
    .eq("athlete_id", athleteId)

  const fundraisingCode =
    (typeof profile?.primary_fundraising_code === "string" && profile.primary_fundraising_code.trim()) ||
    (typeof (athlete as { fundraising_code?: string | null }).fundraising_code === "string" &&
      (athlete as { fundraising_code: string }).fundraising_code.trim()) ||
    ""

  /**
   * `spartan_donations` credits by Stripe metadata `athlete_code` — there is no `athlete_id` column on that table.
   */
  let totalRaisedCents = 0
  let giftCount = 0
  let donationsForRecent: Array<{
    id: string
    amount_cents: number | null
    donor_name: string | null
    donor_email: string | null
    created_at: string
  }> = []

  if (fundraisingCode) {
    const { count, error: countErr } = await admin
      .from("spartan_donations")
      .select("*", { count: "exact", head: true })
      .eq("status", "paid")
      .ilike("athlete_code", fundraisingCode)

    if (!countErr && typeof count === "number") {
      giftCount = count
    }

    const { data: amountRows, error: amtErr } = await admin
      .from("spartan_donations")
      .select("amount_cents")
      .eq("status", "paid")
      .ilike("athlete_code", fundraisingCode)

    if (!amtErr && amountRows?.length) {
      totalRaisedCents = amountRows.reduce((s, r) => s + (typeof r.amount_cents === "number" ? r.amount_cents : 0), 0)
    }

    const { data: recent } = await admin
      .from("spartan_donations")
      .select("id, amount_cents, donor_name, donor_email, created_at")
      .eq("status", "paid")
      .ilike("athlete_code", fundraisingCode)
      .order("created_at", { ascending: false })
      .limit(20)

    donationsForRecent = recent ?? []
  }

  // Get expense requests for this athlete
  const { data: expenses } = await admin
    .from("athlete_expense_requests")
    .select("id, amount_cents, category, description, status, created_at, paid_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(20)

  const paidExpenses = expenses?.filter((e) => e.status === "paid") || []
  const totalSpent = paidExpenses.reduce((sum, e) => sum + (e.amount_cents || 0), 0)
  const pendingExpenses = expenses?.filter((e) => e.status === "pending") || []
  const pendingAmount = pendingExpenses.reduce((sum, e) => sum + (e.amount_cents || 0), 0)
  const available = totalRaisedCents - totalSpent

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
    profile: profile
      ? {
          slug: profile.slug,
          isActive: profile.is_active,
          checkoutLive: profile.checkout_live,
          goalCents: profile.campaign_goal_cents,
          fundraisingCode: profile.primary_fundraising_code,
        }
      : null,
    parent: parentUser
      ? {
          id: parentUser.id,
          email: parentUser.email,
          name: parentUser.full_name,
        }
      : null,
    hasParentLink: (parentLinks?.length || 0) > 0,
    wallet: {
      totalRaisedCents,
      totalSpentCents: totalSpent,
      availableCents: available,
      pendingExpensesCents: pendingAmount,
      giftCount,
      expenseCount: paidExpenses.length,
      pendingExpenseCount: pendingExpenses.length,
    },
    recentDonations:
      donationsForRecent.slice(0, 5).map((d) => ({
        id: d.id,
        amountCents: d.amount_cents,
        donorName: d.donor_name,
        donorEmail: d.donor_email,
        createdAt: d.created_at,
      })) || [],
    recentExpenses:
      expenses?.slice(0, 5).map((e) => ({
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
