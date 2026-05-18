import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/admin-auth"
import { fetchAdminDigitalWalletLedger } from "@/lib/admin-digital-wallet-ledger"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/fundraising/digital-wallet-ledger
 *
 * Athletes (credited gifts) + NC United Training Fund row; totals and registry reconciliation summary.
 */
export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { rows, totals, summary } = await fetchAdminDigitalWalletLedger()
    return NextResponse.json({ rows, totals, summary })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/fundraising/digital-wallet-ledger]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
