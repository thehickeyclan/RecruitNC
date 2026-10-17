import { NextResponse, type NextRequest } from "next/server"

import { sendFamilyDigests } from "@/lib/recruiting/family-digest"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  if (request.headers.get("authorization") === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/**
 * Monday mornings: the weekly family email (lib/recruiting/family-digest.ts). It only counts until
 * FAMILY_DIGEST_SEND=1 is set, which is Matt's go-ahead after reviewing /admin/family-digest.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const dryRun = process.env.FAMILY_DIGEST_SEND !== "1"
  try {
    const result = await sendFamilyDigests(createAdminClient(), { dryRun })
    return NextResponse.json({ ok: true, dryRun, ...result })
  } catch (error) {
    console.error("[cron/family-digest]", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "failed" }, { status: 500 })
  }
}
