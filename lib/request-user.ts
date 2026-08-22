import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Resolve identity from a request, whichever client it came from.
 *
 * The iPhone app sends a bearer token; the website relies on SSR cookies. Routes that both can
 * call have to accept either, and a route that only reads cookies silently treats every app user
 * as signed out.
 */
export async function resolveRequestUserId(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get("authorization")
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  if (bearer) {
    const { data, error } = await createAdminClient().auth.getUser(bearer)
    if (!error && data.user) return data.user.id
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}
