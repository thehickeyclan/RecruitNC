import type { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/** Resolve identity from the widget's bearer token, with SSR cookies as a fallback. */
export async function resolveDataDawgRequestUserId(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get("authorization")
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

  if (bearer) {
    const { data, error } = await createAdminClient().auth.getUser(bearer)
    if (!error && data.user) return data.user.id
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
