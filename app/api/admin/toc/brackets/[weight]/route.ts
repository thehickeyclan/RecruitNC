import { NextResponse } from "next/server"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getBracketLockStatus,
  getLockedDraw,
  lockBracketDraw,
  unlockBracketDraw,
} from "@/lib/toc/bracket-service"
import { parseAthleteWeightClass } from "@/lib/toc/invitations"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ weight: string }> }

function parseWeight(raw: string): number | null {
  return parseAthleteWeightClass(raw)
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const weightClass = parseWeight((await params).weight)
  if (weightClass == null) {
    return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
  }

  const admin = createAdminClient()
  const [draw, status] = await Promise.all([
    getLockedDraw(admin, weightClass),
    getBracketLockStatus(admin, weightClass),
  ])

  return NextResponse.json({ weightClass, draw, status })
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const weightClass = parseWeight((await params).weight)
  if (weightClass == null) {
    return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
  }

  const admin = createAdminClient()
  const result = await lockBracketDraw(admin, weightClass)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, draw: result.draw })
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const weightClass = parseWeight((await params).weight)
  if (weightClass == null) {
    return NextResponse.json({ error: "Invalid weight class" }, { status: 400 })
  }

  const admin = createAdminClient()
  const result = await unlockBracketDraw(admin, weightClass)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
