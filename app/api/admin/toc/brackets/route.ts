import { NextResponse } from "next/server"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBracketLockStatus, listPublicBracketSummaries } from "@/lib/toc/bracket-service"
import { listTocFieldPublicationStatuses } from "@/lib/toc/field-publication-status"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

export const dynamic = "force-dynamic"

/** Admin — lock status for all weights. */
export async function GET() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const [locked, fieldPublication] = await Promise.all([
    listPublicBracketSummaries(admin),
    listTocFieldPublicationStatuses(admin),
  ])
  const fieldStatusByWeight = new Map(fieldPublication.statuses.map((status) => [status.weightClass, status]))

  const statuses = await Promise.all(
    TOC_WEIGHT_CLASSES.map(async (weightClass) => {
      const status = await getBracketLockStatus(admin, weightClass)
      const fieldStatus = fieldStatusByWeight.get(weightClass)
      return {
        weightClass,
        ...status,
        athleteFieldLocked: fieldStatus?.athleteFieldLocked === true,
        athleteFieldLockedAt: fieldStatus?.athleteFieldLockedAt ?? null,
      }
    }),
  )

  return NextResponse.json({
    locked,
    statuses,
    canManage: auth.isAdmin,
    fieldPublicationError: fieldPublication.error,
  })
}
