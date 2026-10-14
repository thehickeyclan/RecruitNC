import { NextResponse, type NextRequest } from "next/server"

import { cleanProfile, EMPTY_PROFILE } from "@/lib/recruiting/family-fit"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * The family's own fit profile: intended majors, budget, home ZIP and distance, size and setting.
 * Kept in the account's own auth user_metadata - readable by the family and the service role,
 * never by a coach - and only ever for the signed-in account itself. Income is not part of it.
 */
export async function GET() {
  const { data } = await (await createClient()).auth.getUser()
  if (!data.user) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  return NextResponse.json({ profile: cleanProfile(data.user.user_metadata?.family_fit ?? EMPTY_PROFILE) })
}

export async function POST(request: NextRequest) {
  const { data } = await (await createClient()).auth.getUser()
  if (!data.user) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  const profile = cleanProfile(await request.json().catch(() => ({})))
  const admin = createAdminClient()
  const { data: current } = await admin.auth.admin.getUserById(data.user.id)
  const { error } = await admin.auth.admin.updateUserById(data.user.id, {
    user_metadata: { ...(current?.user?.user_metadata ?? {}), family_fit: profile },
  })
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 })
  return NextResponse.json({ profile })
}
