import { NextResponse, type NextRequest } from "next/server"

import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { athleteInviteText } from "@/lib/recruiting/priorities/copy"
import { createInviteToken, invitePath } from "@/lib/recruiting/priorities/invite-link"
import { respondentFor } from "@/lib/recruiting/priorities/store"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * A parent's link for their wrestler to answer their own set: { athleteId } → { link, text }.
 * Only a linked parent of that wrestler. Nothing is sent from here: the parent texts it themselves.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { athleteId?: unknown } | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !hasPortalAccess(viewer) || !athleteId) return NextResponse.json({ error: "Not available" }, { status: 403 })
  if ((await respondentFor(admin, userId, athleteId)) !== "parent") return NextResponse.json({ error: "Only a parent can send this." }, { status: 403 })
  const { data: athlete } = await admin.from("athletes").select('"firstName", name').eq("id", athleteId).maybeSingle()
  const first = String(athlete?.firstName ?? "").trim() || String(athlete?.name ?? "").split(" ")[0] || "Hey"
  // The family's own brand: the link opens on the site the parent is using.
  const link = `${request.nextUrl.origin}${invitePath(athleteId, createInviteToken(athleteId))}`
  return NextResponse.json({ link, text: athleteInviteText(first, link) })
}
