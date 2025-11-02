import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const athleteId = params?.id
  if (!athleteId) {
    return NextResponse.json({ error: "Missing athlete id" }, { status: 400 })
  }

  // Auth: read the signed-in user from cookies (SSR client with cookie bridge)
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) {
    console.error("confirm(auth.getUser):", authErr)
  }
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Service-role client for RLS-safe writes (server-only)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 1) Update athletes (source of truth). If this succeeds, we'll return 200.
  let updated = false
  let updateError: any = null
  try {
    const { error } = await admin
      .from("athletes")
      .update({
        profile_verified: true,
        profile_claimed: true,
        claimed_by_user_id: user.id,
        verification_status: "verified",
      })
      .eq("id", athleteId)
    if (error) updateError = error
    else updated = true
  } catch (e) {
    updateError = e
  }

  // 2) Best-effort logging. Never blocks success.
  let logError: any = null
  try {
    const { error } = await admin
      .from("athlete_confirmations")
      .upsert(
        {
          athlete_id: athleteId,
          confirmed_by: user.id,
          confirmation_method: "self_confirmation",
          is_confirmed: true,
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "athlete_id" },
      )
    if (error) logError = error
  } catch (e) {
    logError = e
  }

  if (updated) {
    return NextResponse.json(
      { success: true, details: { logging: logError ? safeErr(logError) : "ok" } },
      { status: 200 },
    )
  }

  return NextResponse.json(
    {
      error: "Failed to confirm profile",
      details: {
        updateError: safeErr(updateError),
        logError: safeErr(logError),
      },
    },
    { status: 500 },
  )
}

function safeErr(err: any) {
  if (!err) return undefined
  if (typeof err === "string") return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}
