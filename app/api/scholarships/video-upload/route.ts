import { NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

import { scholarshipApplicationsAreOpen } from "@/lib/scholarships/applications-open"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const MAX_VIDEO_BYTES = 450 * 1024 * 1024 // ~450 MB — phone 3–5 min at high bitrate
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const

type ClientPayloadShape = { scholarshipSlug?: string }

function assertSlugOpenForApplications(slug: string): Promise<void> {
  return (async () => {
    const s = slug.trim().toLowerCase()
    if (!s || s.length > 80) throw new Error("Invalid scholarship.")

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("scholarships")
      .select("id, slug, status, applications_open_date, applications_close_date")
      .eq("slug", s)
      .maybeSingle()

    if (error || !data) throw new Error("Scholarship not found.")
    if (!scholarshipApplicationsAreOpen(data)) throw new Error("Applications are not open for this scholarship.")
  })()
}

/**
 * Client-direct upload token for scholarship nomination videos (Vercel Blob).
 * Public endpoint: guarded by open-application window + scholarship slug in clientPayload.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let parsed: ClientPayloadShape = {}
        try {
          parsed = clientPayload ? (JSON.parse(clientPayload) as ClientPayloadShape) : {}
        } catch {
          throw new Error("Invalid upload request.")
        }
        const slug = typeof parsed.scholarshipSlug === "string" ? parsed.scholarshipSlug : ""
        await assertSlugOpenForApplications(slug)

        return {
          allowedContentTypes: [...ALLOWED_VIDEO_TYPES],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ scholarshipSlug: slug.trim().toLowerCase() }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        void blob
        // Optional: log or metrics only — application row stores URL after form submit.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload not allowed."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
