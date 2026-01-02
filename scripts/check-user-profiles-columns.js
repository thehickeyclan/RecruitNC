// Script to check user_profiles table columns
// Run with: node scripts/check-user-profiles-columns.js
// Make sure to set environment variables first:
// export NEXT_PUBLIC_SUPABASE_URL=your_url
// export SUPABASE_SERVICE_ROLE_KEY=your_key

const { createClient } = require('@supabase/supabase-js')

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
  const { data: rows, error } = await supabase
    .from("user_profiles")
    .select("*")
    .limit(1)

  if (error) {
    console.error("Error fetching sample:", error)
    return
  }

  if (!rows || rows.length === 0) {
    console.log("No rows found in user_profiles table")
    return
  }

  const sample = rows[0]
  console.log("Sample row:")
  console.log(JSON.stringify(sample, null, 2))
  console.log("\nColumn names found:")
  Object.keys(sample).forEach(key => {
    const value = sample[key]
    const type = value === null ? 'null' : typeof value
    const preview = value === null ? '(null)' : 
                   typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' :
                   JSON.stringify(value)
    console.log(`  - ${key}: ${type} = ${preview}`)
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

  // Check for other important columns
  console.log("\n\nOther important columns:")
  const importantColumns = ['user_id', 'email', 'role', 'cell_phone', 'verified_coach', 'school_id', 'is_admin']
  importantColumns.forEach(key => {
    if (sample.hasOwnProperty(key)) {
      console.log(`  - ${key}: ${JSON.stringify(sample[key])}`)
    } else {
      console.log(`  - ${key}: NOT FOUND`)
    }
  })
}

checkColumns().catch(console.error)

