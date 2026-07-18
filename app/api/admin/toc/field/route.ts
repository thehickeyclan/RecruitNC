import { NextResponse } from "next/server"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTocEventConfig } from "@/lib/toc/event-config"
import { buildTocFieldBoard } from "@/lib/toc/field-board"

export const dynamic = "force-dynamic"

/** Admin field board — all invitations grouped by weight (not public). */
export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const [invitationsResult, config] = await Promise.all([
    admin
      .from("toc_invitations")
      .select("*, athletes(id, name, highschool, graduationyear)")
      .order("weight_class")
      .order("confirmed_at", { ascending: true, nullsFirst: false })
      .order("invited_at", { ascending: true, nullsFirst: false }),
    getTocEventConfig(),
  ])

  const { data, error } = invitationsResult

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        board: buildTocFieldBoard([]),
        bracketsUrl: config.brackets_url,
        unavailable: true,
      })
    }
    console.error("[admin/toc/field]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    board: buildTocFieldBoard(data ?? []),
    bracketsUrl: config.brackets_url,
  })
}
