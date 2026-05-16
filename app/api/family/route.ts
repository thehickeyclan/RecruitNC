import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// GET - Get current user's family and wallet details
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's family membership
    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("family_id, role, is_primary")
      .eq("user_id", user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ 
        hasFamily: false,
        family: null,
        wallet: null,
        athletes: []
      })
    }

    // Get family details
    const { data: family } = await supabase
      .from("families")
      .select("*")
      .eq("id", membership.family_id)
      .single()

    // Get wallet details from view
    const { data: walletDetails } = await supabase
      .from("family_wallet_details")
      .select("*")
      .eq("family_id", membership.family_id)
      .single()

    // Get athletes in family with their fundraising profiles
    const { data: familyAthletes } = await supabase
      .from("family_athletes")
      .select(`
        athlete_id,
        relationship,
        athletes (
          id,
          "firstName",
          "lastName",
          "gradYear",
          school
        )
      `)
      .eq("family_id", membership.family_id)

    // Get fundraising profiles for family athletes
    const athleteIds = familyAthletes?.map(fa => fa.athlete_id) || []
    const { data: fundraisingProfiles } = await supabase
      .from("athlete_fundraising_profiles")
      .select("athlete_id, slug, spartan_code, total_raised_cents, is_active")
      .in("athlete_id", athleteIds)

    // Merge athlete data with fundraising profiles
    const athletes = familyAthletes?.map(fa => {
      const profile = fundraisingProfiles?.find(fp => fp.athlete_id === fa.athlete_id)
      const breakdown = walletDetails?.athlete_breakdown?.find(
        (ab: { athlete_id: string }) => ab.athlete_id === fa.athlete_id
      )
      return {
        ...fa.athletes,
        relationship: fa.relationship,
        fundraising: profile || null,
        raised_cents: breakdown?.raised_cents || 0,
        spent_cents: breakdown?.spent_cents || 0,
      }
    }) || []

    return NextResponse.json({
      hasFamily: true,
      family: {
        ...family,
        role: membership.role,
        is_primary: membership.is_primary,
      },
      wallet: walletDetails ? {
        total_raised_cents: walletDetails.total_raised_cents,
        total_spent_cents: walletDetails.total_spent_cents,
        available_cents: walletDetails.available_cents,
        last_transaction_at: walletDetails.last_transaction_at,
      } : null,
      athletes,
    })
  } catch (error) {
    console.error("Error fetching family:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create a new family for the current user
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name) {
      return NextResponse.json({ error: "Family name is required" }, { status: 400 })
    }

    // Check if user already has a family
    const { data: existingMembership } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single()

    if (existingMembership) {
      return NextResponse.json({ error: "User already belongs to a family" }, { status: 400 })
    }

    // Create family
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({ name })
      .select()
      .single()

    if (familyError) {
      throw familyError
    }

    // Add user as primary member
    const { error: memberError } = await supabase
      .from("family_members")
      .insert({
        family_id: family.id,
        user_id: user.id,
        role: "parent",
        is_primary: true,
      })

    if (memberError) {
      throw memberError
    }

    return NextResponse.json({ family })
  } catch (error) {
    console.error("Error creating family:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
