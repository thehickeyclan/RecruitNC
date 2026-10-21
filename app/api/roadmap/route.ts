import { NextResponse, type NextRequest } from "next/server"

import { cleanDone } from "@/lib/recruiting/learn/roadmap"
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
 * The Recruiting Roadmap items a family has ticked. Kept in the account's own auth user_metadata,
 * like the family fit profile: only ever for the signed-in account, never shown to a coach.
 */
export async function POST(request: NextRequest) {
  const { data } = await (await createClient()).auth.getUser()
  if (!data.user) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  const refused = await commandCenterRefusal()
  if (refused) return refused
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; done?: unknown }
  const [id] = cleanDone([body.id])
  if (!id) return NextResponse.json({ error: "Unknown item" }, { status: 400 })
  const admin = createAdminClient()
  const { data: current } = await admin.auth.admin.getUserById(data.user.id)
  const meta = current?.user?.user_metadata ?? {}
  const done = new Set(cleanDone(meta.roadmap_done))
  if (body.done === false) done.delete(id)
  else done.add(id)
  const { error } = await admin.auth.admin.updateUserById(data.user.id, { user_metadata: { ...meta, roadmap_done: [...done] } })
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 })
  return NextResponse.json({ done: [...done] })
}
