import type { NextRequest } from "next/server"
import { resolveRequestUserId } from "@/lib/request-user"

/**
 * Resolve identity from the widget's bearer token, with SSR cookies as a fallback.
 *
 * Kept as its own export because callers read better for it; the logic is shared with every other
 * route the app and the website both call.
 */
export async function resolveDataDawgRequestUserId(request: NextRequest): Promise<string | null> {
  return resolveRequestUserId(request)
}
