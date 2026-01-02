// Script to check user_profiles table columns
// Run with: npx tsx scripts/check-user-profiles-columns.ts

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  console.log("Checking user_profiles table columns...\n")

  // Get a sample row to see what columns exist
  const { data: sample, error: sampleError } = await supabase
    .from("user_profiles")
    .select("*")
    .limit(1)
    .single()

  if (sampleError) {
    console.error("Error fetching sample:", sampleError)
    
    // Try to get any row
    const { data: anyRow, error: anyError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1)
    
    if (anyError) {
      console.error("Error fetching any row:", anyError)
      return
    }
    
    if (anyRow && anyRow.length > 0) {
      console.log("Sample row columns:")
      console.log(JSON.stringify(anyRow[0], null, 2))
      console.log("\nColumn names found:")
      Object.keys(anyRow[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof anyRow[0][key]} ${anyRow[0][key] === null ? '(null)' : ''}`)
      })
    }
    return
  }

  console.log("Sample row:")
  console.log(JSON.stringify(sample, null, 2))
  console.log("\nColumn names found:")
  Object.keys(sample).forEach(key => {
    const value = sample[key]
    console.log(`  - ${key}: ${typeof value} ${value === null ? '(null)' : `= ${JSON.stringify(value)}`}`)
  })

  // Check specifically for name-related columns
  console.log("\n\nName-related columns:")
  const nameColumns = Object.keys(sample).filter(key => 
    key.toLowerCase().includes('name') || 
    key.toLowerCase().includes('full') ||
    key.toLowerCase().includes('first') ||
    key.toLowerCase().includes('last')
  )
  
  if (nameColumns.length > 0) {
    nameColumns.forEach(key => {
      console.log(`  - ${key}: ${JSON.stringify(sample[key])}`)
    })
  } else {
    console.log("  No name-related columns found!")
  }
}

checkColumns().catch(console.error)

