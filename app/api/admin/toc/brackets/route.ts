import { NextResponse } from "next/server"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBracketLockStatus, listPublicBracketSummaries } from "@/lib/toc/bracket-service"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

/** Admin — lock status for all weights. */
export async function GET() {
  const auth = await requireTocInvitationManager()
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

  return NextResponse.json({ locked, statuses })
}
