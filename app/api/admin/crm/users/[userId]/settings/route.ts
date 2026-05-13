import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { patchCrmContactSettings, appendCrmAudit } from "@/lib/crm-hub-mutations"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
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

  let body: { assigned_admin_user_id?: string | null; priority?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.assigned_admin_user_id != null && body.assigned_admin_user_id !== "" && !UUID_REGEX.test(body.assigned_admin_user_id)) {
    return NextResponse.json({ error: "assigned_admin_user_id must be a UUID" }, { status: 400 })
  }

  const admin = createAdminClient()
  const patched = await patchCrmContactSettings(admin, uid, {
    assigned_admin_user_id: body.assigned_admin_user_id,
    priority: body.priority,
  })

  if (!patched.ok) {
    return NextResponse.json({ error: patched.error }, { status: 400 })
  }

  await appendCrmAudit(admin, {
    contactUserId: uid,
    actorUserId: user.id,
    action: "settings_updated",
    metadata: {
      assigned_admin_user_id: body.assigned_admin_user_id ?? undefined,
      priority: body.priority ?? undefined,
    },
  })

  revalidatePath(`/admin/users/${uid}/crm`)
  return NextResponse.json({ ok: true })
}
