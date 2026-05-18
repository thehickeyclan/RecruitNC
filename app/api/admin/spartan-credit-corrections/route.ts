import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripePaymentIntentIdFromDonationRawMetadata } from "@/lib/spartan-credit-corrections"

export const dynamic = "force-dynamic"

const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i
/** cs_test_… / cs_live_… / pi_… */
const SESSION_RE = /^(cs_[a-zA-Z0-9_]+|pi_[a-zA-Z0-9]+)$/

/**
 * One paid checkout is keyed by cs_… in spartan_donations.id and often by pi_… in corrections / metadata.
 * Writing both rows avoids “still credits to athlete” when one code path only matches the other id.
 */
async function resolveCheckoutAndPaymentIntentIds(
  admin: ReturnType<typeof createAdminClient>,
  rawId: string,
): Promise<{ ids: string[] }> {
  if (rawId.startsWith("cs_")) {
    let pi: string | null = null
    const { data: row } = await admin.from("spartan_donations").select("raw_metadata").eq("id", rawId).maybeSingle()
    const meta = row?.raw_metadata
    if (meta) pi = stripePaymentIntentIdFromDonationRawMetadata(meta)

    if (!pi?.trim()) {
      const sk = process.env.STRIPE_SECRET_KEY?.trim()
      if (sk) {
        try {
          const stripe = new Stripe(sk)
          const s = await stripe.checkout.sessions.retrieve(rawId)
          const p = s.payment_intent
          pi = typeof p === "string" ? p : p?.id ?? null
        } catch (e) {
          console.warn("[spartan-credit-corrections] Stripe session retrieve:", e)
        }
      }
    }

    const out = [rawId, pi?.trim() ?? null].filter((x): x is string => Boolean(x && SESSION_RE.test(x)))
    return { ids: [...new Set(out)] }
  }

  if (rawId.startsWith("pi_")) {
    const { data: row } = await admin
      .from("spartan_donations")
      .select("id")
      .eq("status", "paid")
      .or(`raw_metadata->stripe_payment_intent_id.eq.${rawId}`)
      .limit(1)
      .maybeSingle()

    const cs = typeof row?.id === "string" && SESSION_RE.test(row.id) ? row.id : null
    const out = [cs, rawId].filter((x): x is string => Boolean(x))
    return { ids: [...new Set(out)] }
  }

  return { ids: [rawId] }
}

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
  const { ids: targetIds } = await resolveCheckoutAndPaymentIntentIds(admin, rawId)

  const { error: delErr } = await admin.from("spartan_credit_corrections").delete().in("session_id", targetIds)
  if (delErr) {
    console.error("[spartan-credit-corrections] delete", delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  if (wantsGeneralFund) {
    const insertPayload = targetIds.map((session_id) => ({
      session_id,
      athlete_code: null as null,
      general_fund: true,
    }))
    const { error: insErr } = await admin.from("spartan_credit_corrections").insert(insertPayload)

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
      session_ids_written: targetIds,
      general_fund: true,
      message:
        "Saved as NC United fund credit for this checkout (cs_…) and PaymentIntent (pi_…) when both are known — same behavior as manual dual rows. Reload admin donations after a few seconds.",
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

  const insertAthlete = targetIds.map((session_id) => ({
    session_id,
    athlete_code: normalizedCode,
    general_fund: false,
  }))
  const { error: insErr } = await admin.from("spartan_credit_corrections").insert(insertAthlete)

  if (insErr) {
    console.error("[spartan-credit-corrections] insert", insErr)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    session_id: rawId,
    session_ids_written: targetIds,
    athlete_code: normalizedCode,
    message:
      "Saved for all resolved Stripe ids (cs and/or pi). Public totals refresh shortly. Reload admin donations after a few seconds.",
  })
}
