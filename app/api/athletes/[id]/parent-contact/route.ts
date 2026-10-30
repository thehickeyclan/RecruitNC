import { NextResponse, type NextRequest } from "next/server"

import { cleanParentContact, isValidParentEmail, parentContactAccess, parentContactViewer } from "@/lib/parent-contact"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * The wrestler's parent contact (lib/parent-contact.ts). Anyone not allowed to see it gets
 * `{ see: false }` and nothing else, so the profile draws nothing for them.
 */
const PRIVATE = { headers: { "Cache-Control": "private, no-store" } }

async function gate(request: NextRequest, athleteId: string) {
  const admin = createAdminClient()
  const user = await getUserFromRequest(request)
  const access = parentContactAccess(await parentContactViewer(admin, user?.id ?? null, athleteId))
  return { admin, user, access }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { admin, access } = await gate(request, id)
  if (!access.see) return NextResponse.json({ see: false }, PRIVATE)
  const { data } = await admin.from("athlete_parent_contacts").select("name, email, phone").eq("athlete_id", id).maybeSingle()
  return NextResponse.json({ see: true, edit: access.edit, contact: data ?? null }, PRIVATE)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { admin, user, access } = await gate(request, id)
  if (!access.edit) return NextResponse.json({ error: "Only the wrestler's family can change this." }, { status: 403 })
  const contact = cleanParentContact(await request.json().catch(() => null))
  if (contact && !isValidParentEmail(contact.email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 })
  const { error } = contact
    ? await admin.from("athlete_parent_contacts").upsert({ athlete_id: id, ...contact, updated_by: user!.id, updated_at: new Date().toISOString() })
    : await admin.from("athlete_parent_contacts").delete().eq("athlete_id", id)
  if (error) {
    console.error("[parent-contact]", error.message)
    return NextResponse.json({ error: "Could not save. Try again in a minute." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, contact }, PRIVATE)
}
