import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i
/** cs_test_… / cs_live_… / pi_… */
const SESSION_RE = /^(cs_[a-zA-Z0-9_]+|pi_[a-zA-Z0-9]+)$/

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * POST: Map a paid Checkout Session id (cs_…) or PaymentIntent id (pi_…) to an athlete_code,
 * or set general_fund: true to credit NC United community fund (no wrestler).
 * Merged by /api/spartan/supporters and admin spartan-donations.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { session_id?: string; athlete_code?: string; general_fund?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const rawId = typeof body.session_id === "string" ? body.session_id.trim() : ""
  const wantsGeneralFund = body.general_fund === true

  if (!rawId || !SESSION_RE.test(rawId)) {
    return NextResponse.json(
      {
        error:
          "session_id must be a Stripe Checkout Session id (cs_…) or PaymentIntent id (pi_…) from the payment in Dashboard.",
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { error: delErr } = await admin.from("spartan_credit_corrections").delete().eq("session_id", rawId)
  if (delErr) {
    console.error("[spartan-credit-corrections] delete", delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  if (wantsGeneralFund) {
    const { error: insErr } = await admin
      .from("spartan_credit_corrections")
      .insert({ session_id: rawId, athlete_code: null, general_fund: true })

    if (insErr) {
      console.error("[spartan-credit-corrections] insert general_fund", insErr)
      if (insErr.message?.includes("null value") || insErr.code === "23502") {
        return NextResponse.json(
          {
            error:
              "Database must allow null athlete_code for fund rows. Run scripts/add-spartan-credit-corrections-general-fund.sql in Supabase.",
          },
          { status: 400 },
        )
      }
      if (insErr.message?.includes("general_fund") || insErr.code === "42703") {
        return NextResponse.json(
          {
            error:
              "Missing column general_fund. Run scripts/add-spartan-credit-corrections-general-fund.sql in Supabase.",
          },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      session_id: rawId,
      general_fund: true,
      message:
        "Saved as NC United fund credit. Public /spartan totals refresh within ~1 minute (cache). Reload admin donations after a few seconds.",
    })
  }

  const athleteCode = typeof body.athlete_code === "string" ? body.athlete_code.trim() : ""

  if (!athleteCode || !CODE_RE.test(athleteCode)) {
    return NextResponse.json(
      { error: "athlete_code must look like NCU-LASTNAME-YY (e.g. NCU-APONTEJ-31), or set general_fund: true." },
      { status: 400 },
    )
  }

  const normalizedCode = athleteCode.toUpperCase()

  const { error: insErr } = await admin
    .from("spartan_credit_corrections")
    .insert({ session_id: rawId, athlete_code: normalizedCode, general_fund: false })

  if (insErr) {
    console.error("[spartan-credit-corrections] insert", insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    session_id: rawId,
    athlete_code: normalizedCode,
    message:
      "Saved. Public /spartan totals refresh within ~1 minute (cache). Reload admin donations after a few seconds.",
  })
}
