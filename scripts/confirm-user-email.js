/**
 * Confirm a user's email in Supabase Auth (so they can sign in without clicking the link).
 * Use when a coach's email is blocking the confirmation link.
 *
 * Run with: node scripts/confirm-user-email.js USER_ID_OR_EMAIL
 * Examples:
 *   node scripts/confirm-user-email.js 60da6149-d4f6-4575-a3f4-bb239493298f
 *   node scripts/confirm-user-email.js scbraswell@averett.edu
 *
 * Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in env.
 */

const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const input = process.argv[2]
if (!input) {
  console.error("Usage: node scripts/confirm-user-email.js USER_ID_OR_EMAIL")
  console.error("Example: node scripts/confirm-user-email.js 60da6149-d4f6-4575-a3f4-bb239493298f")
  console.error("Example: node scripts/confirm-user-email.js coach@school.edu")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function confirmUserEmail() {
  let userId = input

  if (input.includes("@")) {
    console.log("Looking up user by email:", input)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listError) {
      console.error("Error listing users:", listError.message)
      process.exit(1)
    }
    const match = users?.find((u) => u.email?.toLowerCase() === input.toLowerCase())
    if (!match) {
      console.error("No user found with email:", input)
      process.exit(1)
    }
    userId = match.id
    console.log("Found user:", match.email, "(" + userId + ")")
  }

  console.log("Confirming email for user:", userId)
  const { data: user, error } = await supabase.auth.admin.updateUserById(userId, { email_confirm: true })

  if (error) {
    console.error("Error:", error.message)
    process.exit(1)
  }

  console.log("Done. User email is now confirmed. They can sign in without clicking the link.")
  if (user?.user?.email) {
    console.log("Email:", user.user.email)
  }
}

confirmUserEmail()
