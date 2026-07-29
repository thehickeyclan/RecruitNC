import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  isTocNominationsTableMissingError,
  TOC_NOMINATIONS_TABLE_SETUP_HINT,
} from "@/lib/toc/nominations-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("toc_nominations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    if (isTocNominationsTableMissingError(error)) {
      return NextResponse.json({
        nominations: [],
        tableMissing: true,
        setupHint: TOC_NOMINATIONS_TABLE_SETUP_HINT,
      })
    }
    console.error("[RecruitNC] admin toc nominations GET", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ nominations: data ?? [], tableMissing: false })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const id = String(body.id ?? "")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body.reviewed === "boolean") updates.reviewed = body.reviewed

  const admin = createAdminClient()
  const { error } = await admin.from("toc_nominations").update(updates).eq("id", id)
  if (error) {
    if (isTocNominationsTableMissingError(error)) {
      return NextResponse.json({ error: TOC_NOMINATIONS_TABLE_SETUP_HINT }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
