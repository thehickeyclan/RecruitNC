import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// POST - Add an athlete to the family
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { athlete_id, relationship = "child" } = await request.json()
    if (!athlete_id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Get user's family (must be primary member)
    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("family_id, is_primary")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: "User does not belong to a family" }, { status: 400 })
    }

    if (!membership.is_primary) {
      return NextResponse.json({ error: "Only primary family members can add athletes" }, { status: 403 })
    }

    // Check if athlete exists
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id")
      .eq("id", athlete_id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Check if athlete is already in a family
    const { data: existingLink } = await supabase
      .from("family_athletes")
      .select("family_id")
      .eq("athlete_id", athlete_id)
      .single()

    if (existingLink) {
      return NextResponse.json({ error: "Athlete already belongs to a family" }, { status: 400 })
    }

    // Add athlete to family
    const { data: familyAthlete, error: linkError } = await supabase
      .from("family_athletes")
      .insert({
        family_id: membership.family_id,
        athlete_id,
        relationship,
      })
      .select()
      .single()

    if (linkError) {
      throw linkError
    }

    // Update any existing ledger entries for this athlete to include family_id
    await supabase
      .from("fundraising_ledger_entries")
      .update({ family_id: membership.family_id })
      .eq("athlete_id", athlete_id)
      .is("family_id", null)

    // Recalculate family wallet totals
    const { data: ledgerTotals } = await supabase
      .from("fundraising_ledger_entries")
      .select("direction, amount_cents")
      .eq("family_id", membership.family_id)

    if (ledgerTotals) {
      const raised = ledgerTotals
        .filter(e => e.direction === "in")
        .reduce((sum, e) => sum + e.amount_cents, 0)
      const spent = ledgerTotals
        .filter(e => e.direction === "out")
        .reduce((sum, e) => sum + e.amount_cents, 0)

      await supabase
        .from("family_wallets")
        .update({
          total_raised_cents: raised,
          total_spent_cents: spent,
          updated_at: new Date().toISOString(),
        })
        .eq("family_id", membership.family_id)
    }

    return NextResponse.json({ familyAthlete })
  } catch (error) {
    console.error("Error adding athlete to family:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Remove an athlete from the family
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athlete_id = searchParams.get("athlete_id")
    
    if (!athlete_id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Get user's family (must be primary member)
    const { data: membership } = await supabase
      .from("family_members")
      .select("family_id, is_primary")
      .eq("user_id", user.id)
      .single()

    if (!membership?.is_primary) {
      return NextResponse.json({ error: "Only primary family members can remove athletes" }, { status: 403 })
    }

    // Remove athlete from family
    const { error: deleteError } = await supabase
      .from("family_athletes")
      .delete()
      .eq("family_id", membership.family_id)
      .eq("athlete_id", athlete_id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing athlete from family:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
