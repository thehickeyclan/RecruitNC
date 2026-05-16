import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchAdminCrmUserHub } from "@/lib/admin-crm-user-hub"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUserIdParam(raw: string): boolean {
  return UUID_REGEX.test(raw.trim())
}

/**
 * GET read-only CRM-style snapshot for one user (admin only).
 * Does not mutate profiles, orders, or subscriptions.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const { userId: rawUserId } = await params
  const userId = rawUserId?.trim() ?? ""
  if (!isUserIdParam(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const payload = await fetchAdminCrmUserHub(admin, userId)
    console.log("[v0] CRM fundraisingWallet for", userId, ":", JSON.stringify(payload.fundraisingWallet, null, 2))
    return NextResponse.json(payload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/crm/users] GET", msg)
    return NextResponse.json({ error: "Failed to load CRM hub" }, { status: 500 })
  }
}
