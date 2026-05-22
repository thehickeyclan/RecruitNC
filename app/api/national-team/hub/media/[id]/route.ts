import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { isNhscaDualsAdmin } from "@/lib/nhsca-duals-live-results/auth"
import {
  isMissingNhscaHubMediaTableError,
  nhscaHubMediaDbErrorMessage,
  NHSCA_HUB_MEDIA_TABLE,
} from "@/lib/nhsca-hub-media"

export const dynamic = "force-dynamic"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing media id." }, { status: 400 })
  }

  const admin = createAdminClientFresh()
  const { data: row, error: fetchErr } = await admin
    .from(NHSCA_HUB_MEDIA_TABLE)
    .select("id, user_id, url")
    .eq("id", id)
    .maybeSingle()

  if (fetchErr) {
    if (isMissingNhscaHubMediaTableError(fetchErr.message)) {
      return NextResponse.json({ error: "Media gallery is not set up yet." }, { status: 503 })
    }
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const isAdmin = await isNhscaDualsAdmin(user)
  const isOwner = row.user_id === user.id
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "You can only remove your own uploads." }, { status: 403 })
  }

  try {
    await del(row.url as string)
  } catch (err) {
    console.warn("[RecruitNC] nhsca hub media blob delete", err)
  }

  const { error: deleteErr } = await admin.from(NHSCA_HUB_MEDIA_TABLE).delete().eq("id", id)
  if (deleteErr) {
    console.error("[RecruitNC] nhsca hub media delete", deleteErr)
    return NextResponse.json(
      { error: nhscaHubMediaDbErrorMessage(deleteErr.message, deleteErr.code) },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
