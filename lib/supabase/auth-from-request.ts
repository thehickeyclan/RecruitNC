import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

/**
 * Resolve the signed-in user from the request. Tries Authorization Bearer first (matches
 * `useAuth().session.access_token` from the client), then Supabase cookies.
 * Mobile Safari often sends Bearer reliably while auth cookies are missing or partitioned.
 * Same pattern as GET /api/national-team/hub.
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const supabase = await createClient()
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  if (bearer) {
    const { data: { user } } = await supabase.auth.getUser(bearer)
    if (user) return user
  }
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}
