import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_activity"

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

export async function GET() {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(150)

  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan.sql",
        activity: [],
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ activity: data ?? [] })
}
