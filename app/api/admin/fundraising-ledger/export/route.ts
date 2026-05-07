import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-auth"
import { buildFundraisingLedgerCsvExport } from "@/lib/fundraising/ledger"

export const dynamic = "force-dynamic"

/**
 * GET — admin-only CSV download of the full fundraising audit ledger (paginated server-side).
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { csv, rowCount, truncated } = await buildFundraisingLedgerCsvExport()
    const safeTs = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `fundraising-ledger-export-${safeTs}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-RecruitNC-Ledger-Row-Count": String(rowCount),
        "X-RecruitNC-Ledger-Truncated": truncated ? "1" : "0",
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Export failed"
    console.error("[admin/fundraising-ledger/export]", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
