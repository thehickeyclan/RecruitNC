import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fileViewer } from "@/lib/recruiting/recruit-file"
import { addNote, cleanNote, deleteNote, listNotes, updateNote, type RecruitNote } from "@/lib/recruiting/recruit-notes"

/**
 * A program's private notes on a wrestler (lib/recruiting/recruit-notes.ts): the recruiting file
 * (app/my-recruits/[athleteId]) and the old program portal. College coaches and admins only; the
 * staff of one school share them, nobody else reads them. Only a note's author edits or removes it.
 */
export const dynamic = "force-dynamic"

async function caller() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const
  const admin = createAdminClient()
  const viewer = await fileViewer(admin, user.id)
  if (!viewer.isCollegeCoach && !viewer.isAdmin) return { error: NextResponse.json({ error: "College coaches only." }, { status: 403 }) } as const
  return { admin, me: { userId: viewer.userId, schoolId: viewer.schoolId } } as const
}

/** The old portal page reads created_at. */
const out = (n: RecruitNote) => ({ ...n, created_at: n.createdAt })
const noStore = { headers: { "Cache-Control": "private, no-store" } }

export async function GET(request: NextRequest) {
  const c = await caller()
  if ("error" in c) return c.error
  const athleteId = new URL(request.url).searchParams.get("athleteId")
  if (!athleteId) return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
  try {
    return NextResponse.json({ notes: (await listNotes(c.admin, c.me, athleteId)).map(out) }, noStore)
  } catch (error) {
    console.error("[notes] read failed:", error)
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const c = await caller()
  if ("error" in c) return c.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const athleteId = typeof body.athleteId === "string" ? body.athleteId : ""
  const note = cleanNote(body.note)
  if (!athleteId || !note) return NextResponse.json({ error: "Write a note first." }, { status: 400 })
  try {
    return NextResponse.json({ note: out(await addNote(c.admin, c.me, athleteId, note)) })
  } catch (error) {
    console.error("[notes] add failed:", error)
    return NextResponse.json({ error: "Could not save the note. Try again." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const c = await caller()
  if ("error" in c) return c.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const noteId = typeof body.noteId === "string" ? body.noteId : ""
  const note = cleanNote(body.note)
  if (!noteId || !note) return NextResponse.json({ error: "Note ID and text required" }, { status: 400 })
  if (!(await updateNote(c.admin, c.me, noteId, note))) return NextResponse.json({ error: "Only the coach who wrote a note can change it." }, { status: 403 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const c = await caller()
  if ("error" in c) return c.error
  const noteId = new URL(request.url).searchParams.get("noteId")
  if (!noteId) return NextResponse.json({ error: "Note ID required" }, { status: 400 })
  if (!(await deleteNote(c.admin, c.me, noteId))) return NextResponse.json({ error: "Only the coach who wrote a note can remove it." }, { status: 403 })
  return NextResponse.json({ success: true })
}
