import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"

/**
 * Image uploads to Vercel Blob.
 *
 * This route used to take a file and a `category` from an unauthenticated request and write
 * straight to `${category}/${filename}` — no session, no file-type check, no size limit, and
 * a caller-controlled path. Because `put` overwrites a matching pathname, anyone who could
 * guess an existing name could replace a club logo or an athlete's headshot in place.
 *
 * It cannot simply require a session: /submit-commitment is a deliberately anonymous form
 * where a fan submits a commitment with a photo. So the rules differ by caller instead —
 * signed-in users keep the deterministic names the media manager depends on, and anonymous
 * uploads are confined to one folder, rate limited, and given a random suffix so they can
 * never land on top of an existing asset.
 */

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"])
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"])

/**
 * The only folder an anonymous caller can reach. This is the folder the public commitment
 * form already writes to, so nothing about that flow changes.
 *
 * Signed-in callers are deliberately not restricted to a list: the blob store already holds
 * two dozen folders (logo, athletes, nchsaa-brackets, event-logos, expense-documents…) and
 * an invented allowlist would silently break the media manager. Requiring a session is what
 * closes the hole; the path is sanitised to a single segment either way.
 */
const ANONYMOUS_CATEGORY = "commit-pictures"

const ANONYMOUS_WINDOW_MS = 60 * 60 * 1000
const ANONYMOUS_MAX_UPLOADS = 5
const anonymousUploads = new Map<string, { count: number; resetAt: number }>()

function anonymousLimitReached(ip: string): boolean {
  const now = Date.now()
  const entry = anonymousUploads.get(ip)
  if (!entry || now > entry.resetAt) {
    anonymousUploads.set(ip, { count: 1, resetAt: now + ANONYMOUS_WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > ANONYMOUS_MAX_UPLOADS
}

/** Strip everything that could steer the write somewhere other than the chosen folder. */
function safeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function extensionOf(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const isSignedIn = Boolean(user)

    const formData = await request.formData()
    const file = formData.get("file")
    const category = String(formData.get("category") ?? "").trim()
    const entityName = String(formData.get("entityName") ?? "").trim()
    const name = String(formData.get("name") ?? "").trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "That file is empty" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Images must be 8MB or smaller" }, { status: 413 })
    }

    // Both checks, because the browser-reported type is trivially spoofed and the extension
    // is what ends up in the public URL.
    const extension = extensionOf(file.name)
    if (!ALLOWED_TYPES.has(file.type) || !extension) {
      return NextResponse.json({ error: "Only JPG, PNG, GIF, WebP or AVIF images can be uploaded" }, { status: 415 })
    }

    let folder: string
    let addRandomSuffix: boolean

    if (isSignedIn) {
      folder = safeSegment(category)
      if (!folder) {
        return NextResponse.json({ error: "A category is required" }, { status: 400 })
      }
      // The media manager addresses logos by a stable path, so signed-in uploads keep
      // deterministic names and are allowed to replace their own.
      addRandomSuffix = false
    } else {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
      if (anonymousLimitReached(ip)) {
        return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 })
      }
      folder = ANONYMOUS_CATEGORY
      // A random suffix means an anonymous upload can never overwrite an existing asset.
      addRandomSuffix = true
    }

    const base = safeSegment(name) || safeSegment(entityName) || safeSegment(file.name.replace(/\.[^.]+$/, "")) || "upload"
    const pathname = `${folder}/${base}.${extension}`

    const blob = await put(pathname, file, { access: "public", addRandomSuffix, contentType: file.type })

    return NextResponse.json({ url: blob.url, pathname: blob.pathname, filename: `${base}.${extension}` })
  } catch (error) {
    console.error("[blob-upload] Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
