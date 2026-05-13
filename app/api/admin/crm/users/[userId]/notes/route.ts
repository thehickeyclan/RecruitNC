import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCrmContactNote, appendCrmAudit, touchCrmContactSettings } from "@/lib/crm-hub-mutations"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { userId } = await params
  const uid = userId?.trim() ?? ""
  if (!UUID_REGEX.test(uid)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { body?: string; pinned?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const admin = createAdminClient()
  const created = await createCrmContactNote(admin, {
    contactUserId: uid,
    authorUserId: user.id,
    body: body.body ?? "",
    pinned: body.pinned,
  })

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 400 })
  }

  await appendCrmAudit(admin, {
    contactUserId: uid,
    actorUserId: user.id,
    action: "note_created",
    metadata: { note_id: created.id },
  })
  await touchCrmContactSettings(admin, uid)

  revalidatePath(`/admin/users/${uid}/crm`)
  return NextResponse.json({ ok: true, id: created.id })
}
