import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-auth"
import { recordFundraisingLedgerTrainingFundToScholarship } from "@/lib/fundraising/ledger"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const MAX_ALLOCATION_CENTS = 50_000_000 * 100 // $50M sanity cap

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const userSupabase = await createClient()
  const {
    data: { user },
  } = await userSupabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { scholarshipSlug?: string; amountCents?: number; note?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const slugRaw = typeof body.scholarshipSlug === "string" ? body.scholarshipSlug.trim().toLowerCase() : ""
  const amountCents = Number(body.amountCents)
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : ""

  if (!slugRaw || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugRaw)) {
    return NextResponse.json({ error: "Invalid scholarship slug." }, { status: 400 })
  }
  if (!Number.isInteger(amountCents) || amountCents < 1 || amountCents > MAX_ALLOCATION_CENTS) {
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: row, error: findErr } = await admin
    .from("scholarships")
    .select("id, slug, name")
    .eq("slug", slugRaw)
    .maybeSingle()

  if (findErr) {
    console.error("[admin/scholarships/training-fund-allocation] lookup:", findErr.message)
    return NextResponse.json({ error: findErr.message }, { status: 500 })
  }
  const sRow = row as { id?: string; name?: string } | null
  const scholarshipId = sRow?.id
  const scholarshipName = (typeof sRow?.name === "string" && sRow.name.trim()) ? sRow.name.trim() : slugRaw
  if (!scholarshipId) return NextResponse.json({ error: "Scholarship not found." }, { status: 404 })

  const { data: donationRow, error: insErr } = await admin
    .from("scholarship_donations")
    .insert({
      scholarship_id: scholarshipId,
      donor_name: "NC United Training Fund (allocation)",
      donor_email: null,
      amount_cents: amountCents,
      display_name: null,
      stripe_payment_id: null,
      receipt_sent: false,
      source: "training_fund_allocation",
      admin_note: note || null,
      allocated_by_user_id: user.id,
    })
    .select("id")
    .maybeSingle()

  if (insErr) {
    console.error("[admin/scholarships/training-fund-allocation] insert:", insErr.message, insErr)
    const hint =
      insErr.message?.includes("source") || insErr.code === "42703"
        ? " Run lib/scholarships/sql/training-fund-allocation.sql in Supabase first."
        : ""
    return NextResponse.json({ error: `${insErr.message}${hint}` }, { status: 500 })
  }

  const donationId = (donationRow as { id?: string } | null)?.id
  if (donationId) {
    await recordFundraisingLedgerTrainingFundToScholarship(admin, {
      scholarshipDonationId: donationId,
      scholarshipId,
      scholarshipName,
      scholarshipSlug: slugRaw,
      amountCents,
      note: note || null,
      actorUserId: user.id,
    })
  }

  return NextResponse.json({ ok: true })
}
