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
  buildStripeAthleteDisplayHintsByCode,
  listSpartanFayettevilleDonations,
  resolvePublicAthleteCreditLabel,
  publicSupporterDisplayName,
  resolvePublicRunnerDisplay,
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
 * GET ?kind=runners|receipts|credits|tees|ledger&days=120
 * CSV downloads for Spartan ops: who’s on course (Spartan), payers (receipts), fundraising credit alignment,
 * or a readable donation ledger (Date / Amount / Donor / Runner / Race|Support / Athlete).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const kind = (request.nextUrl.searchParams.get("kind") ?? "").toLowerCase()
  if (!["runners", "receipts", "credits", "tees", "ledger"].includes(kind)) {
    return NextResponse.json(
      { error: "Query kind must be runners, receipts, credits, tees, or ledger." },
      { status: 400 },
    )
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

    const stripeAthleteHints = buildStripeAthleteDisplayHintsByCode(rows)
    const dateStamp = new Date().toISOString().slice(0, 10)

    if (kind === "ledger") {
      const ledgerRows = [...rows].sort((a, b) => b.createdUnix - a.createdUnix)
      const headers = [
        "date_et",
        "amount_usd",
        "donor",
        "runner",
        "race_or_support",
        "athlete",
        "checkout_session_id",
      ]
      const lines = [
        headers.join(","),
        ...ledgerRows.map((r) => {
          const dateEt = new Date(r.createdIso).toLocaleString("en-US", { timeZone: "America/New_York" })
          const donor = publicSupporterDisplayName(r)
          const runner = resolvePublicRunnerDisplay(r, { anonymousDonorFallback: true })?.trim() || "—"
          const raceOrSupport = r.raceParticipant ? "Race" : "Support"
          const athlete = resolvePublicAthleteCreditLabel(r, codeToFullName, stripeAthleteHints) ?? ""
          return [
            csvCell(dateEt),
            csvCell((r.amountCents / 100).toFixed(2)),
            csvCell(donor),
            csvCell(runner),
            csvCell(raceOrSupport),
            csvCell(athlete),
            csvCell(r.sessionId),
          ].join(",")
        }),
      ]
      const csv = "\uFEFF" + lines.join("\n") + "\n"
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="spartan-donation-ledger-${dateStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (kind === "tees") {
      const teeRows = rows.filter((r) => Boolean(r.teeShirtSize?.trim()))
      const headers = [
        "paid_at_utc",
        "amount_usd",
        "shirt_size",
        "tee_100_eligible_meta",
        "payer_name",
        "payer_email",
        "ship_line1",
        "ship_line2",
        "ship_city",
        "ship_state",
        "ship_postal",
        "ship_country",
        "checkout_session_id",
        "payment_intent_id",
        "race_entry",
        "fundraising_type",
      ]
      const lines = [
        headers.join(","),
        ...teeRows.map((r) =>
          [
            csvCell(r.createdIso),
            csvCell((r.amountCents / 100).toFixed(2)),
            csvCell(r.teeShirtSize ?? ""),
            csvCell(r.tee100Eligible ? "yes" : "no"),
            csvCell(publicSupporterDisplayName(r)),
            csvCell(r.donorEmail ?? ""),
            csvCell(r.teeShipLine1 ?? ""),
            csvCell(r.teeShipLine2 ?? ""),
            csvCell(r.teeShipCity ?? ""),
            csvCell(r.teeShipState ?? ""),
            csvCell(r.teeShipPostal ?? ""),
            csvCell(r.teeShipCountry ?? ""),
            csvCell(r.sessionId),
            csvCell(r.paymentIntentId ?? ""),
            csvCell(r.raceParticipant ? "yes" : "no"),
            csvCell(r.fundraisingType),
          ].join(","),
        ),
      ]
      const csv = "\uFEFF" + lines.join("\n") + "\n"
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="spartan-tee-fulfillment-${dateStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

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
            csvCell(resolvePublicAthleteCreditLabel(r, codeToFullName, stripeAthleteHints) ?? ""),
            csvCell(resolvePublicRunnerDisplay(r, { anonymousDonorFallback: true }) ?? ""),
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
          csvCell(resolvePublicAthleteCreditLabel(r, codeToFullName, stripeAthleteHints) ?? ""),
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
