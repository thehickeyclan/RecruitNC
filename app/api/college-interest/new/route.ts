import { NextResponse } from "next/server"

import { coachInterestScope, newInterestCount } from "@/lib/college-programs/interested-for-coach"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** The coach menu's count beside Interested: new since the coach last opened the page. */
export async function GET() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })
  const admin = createAdminClient()
  const scope = await coachInterestScope(admin, user.id).catch(() => ({ allowed: false }) as const)
  if (!scope.allowed || !scope.schoolId) return NextResponse.json({ count: 0 })
  const count = await newInterestCount(admin, scope.schoolId, scope.gender, scope.seenAt).catch(() => 0)
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } })
}
