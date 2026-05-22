import { NextRequest, NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import {
  NHSCA_HUB_BLOB_ALLOWED_CONTENT_TYPES,
  NHSCA_HUB_MEDIA_EVENT_SLUG,
  NHSCA_HUB_MEDIA_MAX_IMAGE_BYTES,
  NHSCA_HUB_MEDIA_MAX_VIDEO_BYTES,
  NHSCA_HUB_MEDIA_SELECT,
  NHSCA_HUB_MEDIA_TABLE,
  nhscaHubMediaDbErrorMessage,
  type NhscaHubMediaType,
} from "@/lib/nhsca-hub-media"

export const dynamic = "force-dynamic"

type ClientPayload = {
  caption?: string
  eventSlug?: string
  mediaType?: NhscaHubMediaType
  contentType?: string
  originalName?: string
  uploaderName?: string
}

type TokenPayload = ClientPayload & {
  userId: string
  email: string
}

function displayNameFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata ?? {}
  const name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    ""
  return name || user.email?.split("@")[0] || "Parent"
}

/**
 * Client-direct Vercel Blob upload for hub media.
 * Bypasses the ~4.5MB serverless request body limit that breaks iPhone camera photos.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const user = await getUserFromRequest(request)
        if (!user?.id || !user.email) {
          throw new Error("Sign in required.")
        }

        let payload: ClientPayload = {}
        try {
          payload = clientPayload ? (JSON.parse(clientPayload) as ClientPayload) : {}
        } catch {
          throw new Error("Invalid upload request.")
        }

        const mediaType: NhscaHubMediaType = payload.mediaType === "video" ? "video" : "image"
        const maxBytes =
          mediaType === "video" ? NHSCA_HUB_MEDIA_MAX_VIDEO_BYTES : NHSCA_HUB_MEDIA_MAX_IMAGE_BYTES

        const tokenPayload: TokenPayload = {
          userId: user.id,
          email: user.email,
          caption: typeof payload.caption === "string" ? payload.caption.slice(0, 500) : undefined,
          eventSlug: payload.eventSlug?.trim() || NHSCA_HUB_MEDIA_EVENT_SLUG,
          mediaType,
          contentType: payload.contentType ?? "",
          originalName: payload.originalName ?? "upload",
          uploaderName: payload.uploaderName?.trim() || displayNameFromUser(user),
        }

        return {
          allowedContentTypes: [...NHSCA_HUB_BLOB_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: maxBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(tokenPayload),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        let meta: TokenPayload
        try {
          meta = JSON.parse(tokenPayload ?? "{}") as TokenPayload
        } catch {
          console.error("[RecruitNC] nhsca hub media client-upload bad tokenPayload")
          return
        }
        if (!meta.userId || !meta.email) return

        const admin = createAdminClientFresh()
        const { error } = await admin.from(NHSCA_HUB_MEDIA_TABLE).insert({
          event_slug: meta.eventSlug?.trim() || NHSCA_HUB_MEDIA_EVENT_SLUG,
          user_id: meta.userId,
          uploader_email: meta.email,
          uploader_name: meta.uploaderName ?? null,
          media_type: meta.mediaType === "video" ? "video" : "image",
          url: blob.url,
          storage_path: blob.pathname,
          filename: meta.originalName ?? null,
          caption: meta.caption?.trim() || null,
          content_type: meta.contentType || null,
          file_size_bytes: blob.size ?? null,
        })

        if (error) {
          console.error("[RecruitNC] nhsca hub media client-upload db insert", error)
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload not allowed."
    console.error("[RecruitNC] nhsca hub media client-upload", e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

/** After client upload completes, fetch the saved row (onUploadCompleted may lag slightly). */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get("url")?.trim()
  if (!url) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 })
  }

  const admin = createAdminClientFresh()
  const { data, error } = await admin
    .from(NHSCA_HUB_MEDIA_TABLE)
    .select(NHSCA_HUB_MEDIA_SELECT)
    .eq("url", url)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: nhscaHubMediaDbErrorMessage(error.message, error.code) },
      { status: 500 }
    )
  }

  return NextResponse.json({ item: data })
}
