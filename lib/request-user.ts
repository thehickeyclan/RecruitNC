import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { noteAppUsage } from "@/lib/app-usage"

/**
 * Resolve identity from a request, whichever client it came from.
 *
 * The iPhone app sends a bearer token; the website relies on SSR cookies. Routes that both can
 * call have to accept either, and a route that only reads cookies silently treats every app user
 * as signed out.
 *
 * Every authenticated app request passes through here, so this is also where app usage is noted —
 * one place rather than a line in each route that would drift out of date the moment a new
 * endpoint is added.
 */
export async function resolveRequestUserId(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get("authorization")
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  if (bearer) {
    const { data, error } = await createAdminClient().auth.getUser(bearer)
    if (!error && data.user) {
      // Not awaited: a request should not wait on a column nobody is reading in real time.
      void noteAppUsage(request, data.user.id)
      return data.user.id
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  void noteAppUsage(request, user?.id ?? null)
  return user?.id ?? null
}
