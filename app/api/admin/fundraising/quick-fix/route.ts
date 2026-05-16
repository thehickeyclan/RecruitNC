import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdminSession } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const adminCheck = await verifyAdminSession()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  
  try {
    const { athlete_id, action } = await request.json()

    if (!athlete_id || !action) {
      return NextResponse.json({ error: "Missing athlete_id or action" }, { status: 400 })
    }

    // Get athlete info
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select('id, "firstName", "lastName"')
      .eq("id", athlete_id)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    switch (action) {
      case "create_family": {
        // Create a family for this athlete
        const familyName = `${athlete.lastName} Family`
        
        const { data: newFamily, error: familyError } = await supabase
          .from("families")
          .insert({ name: familyName })
          .select()
          .single()

        if (familyError) {
          console.error("Error creating family:", familyError)
          return NextResponse.json({ error: "Failed to create family" }, { status: 500 })
        }

        // Link athlete to family
        const { error: linkError } = await supabase
          .from("family_athletes")
          .insert({
            family_id: newFamily.id,
            athlete_id: athlete_id,
            relationship: "child"
          })

        if (linkError) {
          console.error("Error linking athlete:", linkError)
          return NextResponse.json({ error: "Failed to link athlete to family" }, { status: 500 })
        }

        // Create wallet for family (trigger should do this, but ensure it exists)
        const { data: existingWallet } = await supabase
          .from("family_wallets")
          .select("id")
          .eq("family_id", newFamily.id)
          .single()

        if (!existingWallet) {
          await supabase
            .from("family_wallets")
            .insert({ family_id: newFamily.id })
        }

        return NextResponse.json({ 
          success: true, 
          message: `Created "${familyName}" and linked ${athlete.firstName}`,
          family_id: newFamily.id
        })
      }

      case "activate_page": {
        // Activate the athlete's fundraising page
        const { error: updateError } = await supabase
          .from("athlete_fundraising_profiles")
          .update({ is_active: true })
          .eq("athlete_id", athlete_id)

        if (updateError) {
          console.error("Error activating page:", updateError)
          return NextResponse.json({ error: "Failed to activate page" }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          message: `Activated fundraising page for ${athlete.firstName}`
        })
      }

      case "generate_code": {
        // Generate a spartan code for this athlete
        const code = `${athlete.lastName.toUpperCase().slice(0, 4)}${athlete.firstName.toUpperCase().slice(0, 2)}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`
        
        // Check if they have a fundraising profile
        const { data: profile } = await supabase
          .from("athlete_fundraising_profiles")
          .select("id")
          .eq("athlete_id", athlete_id)
          .single()

        if (profile) {
          // Update existing profile with spartan code
          const { error: updateError } = await supabase
            .from("athlete_fundraising_profiles")
            .update({ spartan_code: code })
            .eq("athlete_id", athlete_id)

          if (updateError) {
            console.error("Error updating profile:", updateError)
            return NextResponse.json({ error: "Failed to generate code" }, { status: 500 })
          }
        } else {
          // Create new profile with spartan code
          const slug = `${athlete.firstName.toLowerCase()}-${athlete.lastName.toLowerCase()}-${Date.now().toString(36)}`
          
          const { error: insertError } = await supabase
            .from("athlete_fundraising_profiles")
            .insert({
              athlete_id: athlete_id,
              slug: slug,
              spartan_code: code,
              is_active: true,
              total_raised_cents: 0,
              campaign_goal_cents: 50000 // Default $500 goal
            })

          if (insertError) {
            console.error("Error creating profile:", insertError)
            return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
          }
        }

        return NextResponse.json({ 
          success: true, 
          message: `Generated code ${code} for ${athlete.firstName}`,
          code
        })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Quick fix error:", error)
    return NextResponse.json({ error: "Failed to apply fix" }, { status: 500 })
  }
}
