import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

/**
 * First line of every admin-only API handler: a signed-in admin, or a 401/403.
 *
 * Added 1 October 2026 to 140-odd routes that changed data with no sign-in check at all - old
 * fix scripts, debug tools, uploads and match loaders, each reachable by anyone who knew the URL.
 * The middleware cannot do this (it must not call getUser; see AUTH_CONFIG_LOCKED.md), so the
 * check lives in the route.
 */
export async function adminGate(): Promise<NextResponse | null> {
  const auth = await requireAdmin()
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status })
}
