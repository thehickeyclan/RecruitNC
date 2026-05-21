import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  manifestFromResults,
  processAllNhscaGearImages,
  processNhscaGearImage,
} from "@/lib/nhsca-process-gear-images"
import { NHSCA_DUALS_2026_ALL_GEAR_PHOTOS } from "@/lib/nhsca-duals-2026-gear-images"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  return NextResponse.json({
    photos: NHSCA_DUALS_2026_ALL_GEAR_PHOTOS,
    falConfigured: Boolean(process.env.FAL_KEY),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  })
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY is not configured" }, { status: 500 })
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured" }, { status: 500 })
  }

  let body: { ids?: string[]; appBaseUrl?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const appBaseUrl =
    body.appBaseUrl?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.nextUrl.origin

  const results =
    body.ids?.length === 1
      ? [await processNhscaGearImage(body.ids[0], { appBaseUrl })]
      : await processAllNhscaGearImages({ ids: body.ids, appBaseUrl })

  const manifest = manifestFromResults(results)
  const succeeded = results.filter((r) => r.status === "success").length
  const failed = results.filter((r) => r.status === "error").length

  return NextResponse.json({
    results,
    manifest,
    manifestInstructions:
      "Copy the manifest object into lib/nhsca-gear-processed-manifest.json and commit, or set NEXT_PUBLIC_NHSCA_GEAR_CDN to your Blob folder base URL.",
    summary: { total: results.length, succeeded, failed },
  })
}
