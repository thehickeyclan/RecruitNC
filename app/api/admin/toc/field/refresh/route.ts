import { NextResponse } from "next/server"

import { getPublicAnnouncedWeight, refreshPublicAnnouncedField } from "@/lib/toc/public-announced-field"
import { requireTocFieldViewer } from "@/lib/toc/require-toc-field-viewer"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"

/**
 * Rebuild the public field pages on demand, and say what they now show.
 *
 * The routes that change the field refresh it themselves. This exists for the case they cannot
 * cover: the field edited straight in SQL, or a page already sitting on a stale entry when the
 * fix ships — a deploy does not clear the data cache, so without this the only cure is waiting
 * out the day-long window. Returning the roster makes it verifiable in one click rather than
 * trusting that something happened.
 */
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireTocFieldViewer()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  await refreshPublicAnnouncedField("manual refresh")

  const weights = await Promise.all(
    [...TOC_WEIGHT_CLASSES].map(async (weightClass) => {
      const field = await getPublicAnnouncedWeight(weightClass)
      return {
        weightClass,
        announced: Boolean(field),
        athletes: field?.athletes.map((athlete) => athlete.name) ?? [],
      }
    }),
  )

  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString(), weights })
}
