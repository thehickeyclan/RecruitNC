import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// Back-compat for any legacy clients still calling /api/athletes/confirm-profile.
// It now auto-detects the athlete id (body/query/referer) and won't 500 if logging fails.
export async function POST(req: NextRequest) {
  // Try: JSON body
  let body: any = null
  try {
    body = await req.json()
  } catch {
    // ignore parse errors; may be empty body
  }

  // Try: query param
  const url = new URL(req.url)
  const qpId = url.searchParams.get("id")

  // Try: referer (/athletes/:id) to extract id
  const ref = req.headers.get("referer") || ""
  const refMatch = ref.match(/\/athletes\/([0-9a-fA-F-]{18,})/)

  const athleteId =
    body?.athleteId ||
    body?.athlete_id ||
    body?.id ||
    qpId ||
    (refMatch ? refMatch[1] : null)

  if (!athleteId) {
    return NextResponse.json(
      { error: "Missing athlete id. Pass body.athleteId, ?id=, or POST /api/athletes/[id]/confirm." },
      { status: 400 },
    )
  }

  // Auth: get the user from cookies
  const supabase = createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr) {
    console.error("confirm-profile(auth.getUser):", authErr)
  }
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Service role client
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 1) Update athlete record
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

  // 2) Best-effort log
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
