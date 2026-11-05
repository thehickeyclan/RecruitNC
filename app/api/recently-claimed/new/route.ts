import { NextResponse } from "next/server"

import { viewSubject } from "@/lib/view-as/subject"
import { coachInterestScope } from "@/lib/college-programs/interested-for-coach"
import { claimedSeenAt, newClaimedCount } from "@/lib/college-programs/just-claimed-for-coach"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** The coach menu's count beside Recently Claimed: new since the coach last opened the page. */
export async function GET() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ count: 0 })
  const admin = createAdminClient()
  const subject = await viewSubject(admin, user)
  const scope = await coachInterestScope(admin, subject.subjectId).catch(() => ({ allowed: false }) as const)
  if (!scope.allowed) return NextResponse.json({ count: 0 })
  const account = await admin.auth.admin.getUserById(subject.subjectId).then((r) => r.data?.user ?? null, () => null)
  const count = await newClaimedCount(admin, scope.gender, claimedSeenAt(account)).catch(() => 0)
  return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } })
}
