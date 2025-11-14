import { NextResponse, type NextRequest } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const athleteId = params?.id
  if (!athleteId) {
    return NextResponse.json({ error: "Missing athlete id" }, { status: 400 })
  }

  // Require an authenticated admin
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) console.error("reset:auth.getUser", authErr)
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()
  if (profileErr) console.error("reset:getProfile", profileErr)
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 })

  // Admin client for RLS-safe operations
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Best-effort clear confirmation log
  let logCleared = false
  let logError: any = null
  try {
    const { error } = await admin.from("athlete_confirmations").delete().eq("athlete_id", athleteId)
    if (error) logError = error
    else logCleared = true
  } catch (e) {
    logError = e
  }

  // Reset athlete flags
  let updated = false
  let updateError: any = null
  try {
    const { error } = await admin
      .from("athletes")
      .update({
        profile_verified: false,
        profile_claimed: false,
        claimed_by_user_id: null,
        verification_status: "unverified",
      })
      .eq("id", athleteId)
    if (error) updateError = error
    else updated = true
  } catch (e) {
    updateError = e
  }

  if (updated) {
    return NextResponse.json(
      {
        success: true,
        details: { logCleared, logError: logCleared ? undefined : stringifyErr(logError) },
      },
      { status: 200 }
    )
  }

  return NextResponse.json(
    {
      error: "Failed to reset athlete verification",
      details: { updateError: stringifyErr(updateError), logError: stringifyErr(logError) },
    },
    { status: 500 }
  )
}

function stringifyErr(err: any) {
  if (!err) return undefined
  if (typeof err === "string") return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}
