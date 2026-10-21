import { NextResponse, type NextRequest } from "next/server"

import { cleanProfile, EMPTY_PROFILE } from "@/lib/recruiting/family-fit"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"

export const dynamic = "force-dynamic"

/** Part of the Recruiting Command Center: Blue, a Command Center plan, or staff. */
async function commandCenterRefusal(): Promise<NextResponse | null> {
  const { viewer } = await resolvePortalViewer({ supabase: await createClient(), admin: createAdminClient() })
  return hasPortalAccess(viewer) ? null : NextResponse.json({ error: "Part of the Recruiting Command Center.", upgrade: "/command-center" }, { status: 403 })
}

/**
 * The family's own fit profile: intended majors, budget, home ZIP and distance, size and setting.
 * Kept in the account's own auth user_metadata - readable by the family and the service role,
 * never by a coach - and only ever for the signed-in account itself. Income is not part of it.
 */
export async function GET() {
  const { data } = await (await createClient()).auth.getUser()
  if (!data.user) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  const refused = await commandCenterRefusal()
  if (refused) return refused
  return NextResponse.json({ profile: cleanProfile(data.user.user_metadata?.family_fit ?? EMPTY_PROFILE) })
}

export async function POST(request: NextRequest) {
  const { data } = await (await createClient()).auth.getUser()
  if (!data.user) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  const refused = await commandCenterRefusal()
  if (refused) return refused
  const profile = cleanProfile(await request.json().catch(() => ({})))
  const admin = createAdminClient()
  const { data: current } = await admin.auth.admin.getUserById(data.user.id)
  const { error } = await admin.auth.admin.updateUserById(data.user.id, {
    user_metadata: { ...(current?.user?.user_metadata ?? {}), family_fit: profile },
  })
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 })
  return NextResponse.json({ profile })
}
