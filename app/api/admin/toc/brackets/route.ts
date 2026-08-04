import { NextResponse } from "next/server"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBracketLockStatus, listPublicBracketSummaries } from "@/lib/toc/bracket-service"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

/** Admin — lock status for all weights. */
export async function GET() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const locked = await listPublicBracketSummaries(admin)

  const statuses = await Promise.all(
    TOC_WEIGHT_CLASSES.map(async (weightClass) => {
      const status = await getBracketLockStatus(admin, weightClass)
      return { weightClass, ...status }
    }),
  )

  return NextResponse.json({ locked, statuses, canManage: auth.isAdmin })
}
