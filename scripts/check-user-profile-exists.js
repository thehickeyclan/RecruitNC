// Script to check if a user profile exists
// Run with: node scripts/check-user-profile-exists.js USER_ID
// Example: node scripts/check-user-profile-exists.js 8dfd328c-d4ee-41e7-98bb-798f15540dbd

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const userId = process.argv[2]

if (!userId) {
  console.error("Usage: node scripts/check-user-profile-exists.js USER_ID")
  console.error("Example: node scripts/check-user-profile-exists.js 8dfd328c-d4ee-41e7-98bb-798f15540dbd")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserProfile() {
  console.log(`Checking user profile for: ${userId}\n`)

  // Check in user_profiles
  console.log("1. Checking user_profiles table...")
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (profileError) {
    console.error("Error:", profileError)
  } else if (profile) {
    console.log("✓ Profile found in user_profiles:")
    console.log(JSON.stringify(profile, null, 2))
  } else {
    console.log("✗ Profile NOT found in user_profiles")
  }

  // Check in auth.users
  console.log("\n2. Checking auth.users table...")
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

  if (authError) {
    console.error("Error:", authError)
  } else if (authUser?.user) {
    console.log("✓ User found in auth.users:")
    console.log(JSON.stringify({
      id: authUser.user.id,
      email: authUser.user.email,
      created_at: authUser.user.created_at,
      last_sign_in_at: authUser.user.last_sign_in_at
    }, null, 2))
  } else {
    console.log("✗ User NOT found in auth.users")
  }

  // Check sample profiles to see format
  console.log("\n3. Sample user_ids in user_profiles (to check format):")
  const { data: samples } = await supabase
    .from("user_profiles")
    .select("user_id, email, full_name")
    .limit(5)

  if (samples && samples.length > 0) {
    samples.forEach((p, i) => {
      console.log(`  ${i + 1}. user_id: ${p.user_id} (type: ${typeof p.user_id})`)
      console.log(`     email: ${p.email}`)
      console.log(`     full_name: ${p.full_name || 'null'}`)
    })
  }

  // Summary
  console.log("\n=== SUMMARY ===")
  if (profile) {
    console.log("✓ Profile exists in user_profiles - update should work")
  } else {
    console.log("✗ Profile does NOT exist in user_profiles")
    if (authUser?.user) {
      console.log("  → User exists in auth.users but no profile - profile needs to be created")
    } else {
      console.log("  → User also doesn't exist in auth.users")
    }
  }
}

checkUserProfile().catch(console.error)




