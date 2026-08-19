import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Deletes the signed-in user's own account.
 *
 * Apple requires in-app account deletion for any app that offers account creation (guideline
 * 5.1.1(v)), so the iPhone app needs a real endpoint rather than a "email us" instruction.
 *
 * The account is resolved from the caller's own token and never from the request body — there is
 * no path here that lets one user delete another.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const admin = createAdminClient()

  // Detach the athlete profile rather than deleting it: commitments and rankings are published
  // sports records that outlive an account, and an athlete may have been added by staff.
  const { error: profileError } = await admin
    .from("user_profiles")
    .delete()
    .eq("user_id", user.id)

  if (profileError) {
    console.error("[account/delete] profile", profileError)
    return NextResponse.json({ error: "Could not delete the account." }, { status: 500 })
  }

  // Push registrations are keyed on the device token, not the user, so any device this account
  // signed in on simply reverts to anonymous alerts rather than losing them.
  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    console.error("[account/delete] auth", authError)
    return NextResponse.json({ error: "Could not delete the account." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
