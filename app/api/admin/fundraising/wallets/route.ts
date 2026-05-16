import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"

interface AthleteBreakdown {
  athlete_id: string
  athlete_name: string
  raised_cents: number
  spent_cents: number
}

export async function GET() {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck

  const supabase = await createClient()

  try {
    // Get all families with their wallet details using the new view
    const { data: familyWallets, error: walletsError } = await supabase
      .from("family_wallet_details")
      .select("*")

    if (walletsError) {
      // Fall back to old method if view doesn't exist yet
      return getFallbackWallets(supabase)
    }

    // Get family members for parent info
    const familyIds = familyWallets?.map((fw) => fw.family_id) || []
    
    const { data: familyMembers } = await supabase
      .from("family_members")
      .select("family_id, user_id, is_primary, role")
      .in("family_id", familyIds)

    // Get user profiles for parents
    const userIds = familyMembers?.map((fm) => fm.user_id) || []
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("user_id, email, display_name, first_name, last_name")
      .in("user_id", userIds)

    const userMap = (userProfiles || []).reduce((acc, u) => {
      acc[u.user_id] = {
        email: u.email,
        name: u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || null,
      }
      return acc
    }, {} as Record<string, { email: string; name: string | null }>)

    // Get family athletes for athlete details
    const { data: familyAthletes } = await supabase
      .from("family_athletes")
      .select(`
        family_id,
        athlete_id,
        athletes (
          id,
          "firstName",
          "lastName"
        )
      `)
      .in("family_id", familyIds)

    // Build wallet data with family structure
    const wallets = (familyWallets || []).map((fw) => {
      // Find primary parent for this family
      const primaryMember = familyMembers?.find(
        (fm) => fm.family_id === fw.family_id && fm.is_primary
      )
      const parentInfo = primaryMember ? userMap[primaryMember.user_id] : null

      // Get athletes in this family
      const athletes = familyAthletes
        ?.filter((fa) => fa.family_id === fw.family_id)
        .map((fa) => ({
          id: fa.athlete_id,
          name: fa.athletes ? `${fa.athletes.firstName} ${fa.athletes.lastName}` : "Unknown",
        })) || []

      // Parse athlete breakdown
      const breakdown = (fw.athlete_breakdown as AthleteBreakdown[] | null) || []

      return {
        familyId: fw.family_id,
        familyName: fw.family_name,
        athletes,
        athleteBreakdown: breakdown,
        parentEmail: parentInfo?.email || null,
        parentName: parentInfo?.name || null,
        totalRaisedCents: fw.total_raised_cents || 0,
        totalSpentCents: fw.total_spent_cents || 0,
        availableCents: fw.available_cents || 0,
        lastTransactionAt: fw.last_transaction_at,
        hasParentLink: !!primaryMember,
      }
    })

    // Sort by available balance descending
    wallets.sort((a, b) => b.availableCents - a.availableCents)

    return NextResponse.json({ wallets, usesNewModel: true })
  } catch (error) {
    console.error("Wallets error:", error)
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 })
  }
}

// Fallback for old data model (athletes without families)
async function getFallbackWallets(supabase: Awaited<ReturnType<typeof createClient>>) {
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
      spartan_code,
      total_raised_cents
    `)

  if (profilesError) throw profilesError

  // Get athlete details
  const athleteIds = profiles?.map((p) => p.athlete_id) || []
  const { data: athletes } = await supabase
    .from("athletes")
    .select('id, "firstName", "lastName"')
    .in("id", athleteIds)

  const athleteMap = (athletes || []).reduce((acc, a) => {
    acc[a.id] = `${a.firstName} ${a.lastName}`
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

  // Get user profiles for parents
  const userIds = Object.values(parentLinksMap)
  let userEmailsMap: Record<string, { email: string; name: string | null }> = {}

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("user_profiles")
      .select("user_id, email, display_name, first_name, last_name")
      .in("user_id", userIds)

    userEmailsMap = (users || []).reduce((acc, u) => {
      acc[u.user_id] = {
        email: u.email,
        name: u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || null,
      }
      return acc
    }, {} as Record<string, { email: string; name: string | null }>)
  }

  // Get ledger totals by athlete
  const { data: ledgerEntries } = await supabase
    .from("fundraising_ledger_entries")
    .select("athlete_id, direction, amount_cents")
    .in("athlete_id", athleteIds)

  const ledgerByAthlete = (ledgerEntries || []).reduce((acc, entry) => {
    if (!acc[entry.athlete_id]) {
      acc[entry.athlete_id] = { raised: 0, spent: 0 }
    }
    if (entry.direction === "in") {
      acc[entry.athlete_id].raised += entry.amount_cents
    } else if (entry.direction === "out") {
      acc[entry.athlete_id].spent += entry.amount_cents
    }
    return acc
  }, {} as Record<string, { raised: number; spent: number }>)

  // Build wallet data (one per athlete, old model)
  const wallets = (profiles || []).map((profile) => {
    const ledger = ledgerByAthlete[profile.athlete_id] || { raised: 0, spent: 0 }
    const raisedCents = ledger.raised || profile.total_raised_cents || 0
    const spentCents = ledger.spent
    const parentUserId = parentLinksMap[profile.athlete_id]
    const parentInfo = parentUserId ? userEmailsMap[parentUserId] : null

    return {
      familyId: null,
      familyName: null,
      athletes: [{ id: profile.athlete_id, name: athleteMap[profile.athlete_id] || "Unknown" }],
      athleteBreakdown: [{
        athlete_id: profile.athlete_id,
        athlete_name: athleteMap[profile.athlete_id] || "Unknown",
        raised_cents: raisedCents,
        spent_cents: spentCents,
      }],
      parentEmail: parentInfo?.email || null,
      parentName: parentInfo?.name || null,
      totalRaisedCents: raisedCents,
      totalSpentCents: spentCents,
      availableCents: raisedCents - spentCents,
      lastTransactionAt: null,
      hasParentLink: !!parentUserId,
      athleteCode: profile.primary_fundraising_code || profile.spartan_code,
      profileActive: profile.is_active && profile.checkout_live,
    }
  })

  // Sort by available balance descending
  wallets.sort((a, b) => b.availableCents - a.availableCents)

  return NextResponse.json({ wallets, usesNewModel: false })
}
