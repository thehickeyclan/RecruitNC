import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fundraisingCodeToFullNameMap, getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsMap,
} from "@/lib/spartan-credit-corrections"
import {
  listSpartanFayettevilleDonations,
  resolvePublicAthleteCreditLabel,
  publicSupporterDisplayName,
} from "@/lib/spartan-fayetteville-stripe"

export const dynamic = "force-dynamic"

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

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * GET ?kind=runners|receipts|credits&days=120
 * CSV downloads for Spartan ops: who’s on course (Spartan), payers (receipts), fundraising credit alignment.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const kind = (request.nextUrl.searchParams.get("kind") ?? "").toLowerCase()
  if (!["runners", "receipts", "credits"].includes(kind)) {
    return NextResponse.json({ error: "Query kind must be runners, receipts, or credits." }, { status: 400 })
  }

  let days = Number(request.nextUrl.searchParams.get("days") ?? "120")
  if (!Number.isFinite(days) || days < 1) days = 120
  if (days > 400) days = 400

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)

  try {
    const raw = await listSpartanFayettevilleDonations(stripe, since)
    const admin = createAdminClient()
    const correctionMap = await fetchSpartanCreditCorrectionsMap(admin)
    const rows = applySpartanCreditCorrectionsToDonations(raw, correctionMap)

    let codeToFullName = new Map<string, string>()
    try {
      const directory = await getFundraisingAthleteEntries(admin)
      codeToFullName = fundraisingCodeToFullNameMap(directory)
    } catch {
      /* optional */
    }

    const dateStamp = new Date().toISOString().slice(0, 10)

    if (kind === "runners") {
      const raceRows = rows.filter((r) => r.raceParticipant)
      const headers = [
        "paid_at_utc",
        "amount_usd",
        "checkout_session_id",
        "payment_intent_id",
        "payer_name_for_display",
        "payer_email",
        "tier_preference",
        "credited_athlete_code",
        "credited_athlete_label",
        "runner_on_course",
        "fundraising_type",
      ]
      const lines = [
        headers.join(","),
        ...raceRows.map((r) =>
          [
            csvCell(r.createdIso),
            csvCell((r.amountCents / 100).toFixed(2)),
            csvCell(r.sessionId),
            csvCell(r.paymentIntentId ?? ""),
            csvCell(publicSupporterDisplayName(r)),
            csvCell(r.donorEmail ?? ""),
            csvCell(r.tierPreference),
            csvCell(r.athleteCode ?? ""),
            csvCell(resolvePublicAthleteCreditLabel(r, codeToFullName) ?? ""),
            csvCell(r.raceParticipantName ?? ""),
            csvCell(r.fundraisingType),
          ].join(","),
        ),
      ]
      const csv = "\uFEFF" + lines.join("\n") + "\n"
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="spartan-runners-${dateStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (kind === "receipts") {
      const headers = [
        "paid_at_utc",
        "amount_usd",
        "checkout_session_id",
        "payment_intent_id",
        "payer_name",
        "payer_email",
        "show_name_on_public_list",
        "fundraising_type",
        "race_entry",
      ]
      const lines = [
        headers.join(","),
        ...rows.map((r) =>
          [
            csvCell(r.createdIso),
            csvCell((r.amountCents / 100).toFixed(2)),
            csvCell(r.sessionId),
            csvCell(r.paymentIntentId ?? ""),
            csvCell(r.donorName ?? ""),
            csvCell(r.donorEmail ?? ""),
            csvCell(r.donorListPublic ? "yes" : "no"),
            csvCell(r.fundraisingType),
            csvCell(r.raceParticipant ? "yes" : "no"),
          ].join(","),
        ),
      ]
      const csv = "\uFEFF" + lines.join("\n") + "\n"
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="spartan-receipts-payers-${dateStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    const headers = [
      "paid_at_utc",
      "amount_usd",
      "checkout_session_id",
      "payment_intent_id",
      "athlete_code_for_totals",
      "credit_label",
      "attribution",
      "fundraising_type",
      "race_entry",
    ]
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          csvCell(r.createdIso),
          csvCell((r.amountCents / 100).toFixed(2)),
          csvCell(r.sessionId),
          csvCell(r.paymentIntentId ?? ""),
          csvCell(r.athleteCode ?? ""),
          csvCell(resolvePublicAthleteCreditLabel(r, codeToFullName) ?? ""),
          csvCell(r.attribution),
          csvCell(r.fundraisingType),
          csvCell(r.raceParticipant ? "yes" : "no"),
        ].join(","),
      ),
    ]
    const csv = "\uFEFF" + lines.join("\n") + "\n"
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="spartan-fundraising-credit-${dateStamp}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    console.error("[admin/spartan-export]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 500 },
    )
  }
}
