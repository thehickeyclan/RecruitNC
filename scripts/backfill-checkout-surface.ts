/**
 * Backfill `fundraising_checkout_surface` for existing spartan_donations.
 * 
 * Logic:
 * - If fundraising_checkout_surface is already set, skip
 * - If fundraising_athlete_slug is set, it was an athlete_page checkout
 * - Otherwise, it was a spartan_team_page checkout (the /spartan page)
 * 
 * Run with: npx tsx scripts/backfill-checkout-surface.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey)

async function backfill() {
  console.log("Fetching donations with NULL fundraising_checkout_surface...")
  
  const { data: donations, error } = await admin
    .from("spartan_donations")
    .select("id, fundraising_checkout_surface, fundraising_athlete_slug")
    .is("fundraising_checkout_surface", null)
  
  if (error) {
    console.error("Error fetching donations:", error.message)
    process.exit(1)
  }
  
  console.log(`Found ${donations?.length || 0} donations to backfill`)
  
  if (!donations?.length) {
    console.log("Nothing to backfill!")
    return
  }
  
  let athletePageCount = 0
  let spartanPageCount = 0
  
  for (const donation of donations) {
    const surface = donation.fundraising_athlete_slug 
      ? "athlete_page" 
      : "spartan_team_page"
    
    const { error: updateError } = await admin
      .from("spartan_donations")
      .update({ fundraising_checkout_surface: surface })
      .eq("id", donation.id)
    
    if (updateError) {
      console.error(`Error updating ${donation.id}:`, updateError.message)
    } else {
      if (surface === "athlete_page") {
        athletePageCount++
      } else {
        spartanPageCount++
      }
    }
  }
  
  console.log("\nBackfill complete!")
  console.log(`  - Spartan page: ${spartanPageCount}`)
  console.log(`  - Athlete page: ${athletePageCount}`)
}

backfill().catch(console.error)
