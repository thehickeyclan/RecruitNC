import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import type { TocProjectChatReaction } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_chat_messages"
const REACTION_EMOJIS = ["👍", "❤️", "✅", "👀", "🔥", "😂"]

function fallbackName(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

async function displayNameForUser(admin: ReturnType<typeof createAdminClient>, userId: string, email: string): Promise<string> {
  const { data } = await admin
    .from("user_profiles")
    .select("full_name,first_name,last_name,email")
    .or(`user_id.eq.${userId},email.eq.${email.toLowerCase()}`)
    .limit(1)
    .maybeSingle()

  if (data) {
    const record = data as Record<string, unknown>
    const fullName = String(record.full_name ?? "").trim()
    const first = String(record.first_name ?? "").trim()
    const last = String(record.last_name ?? "").trim()
    const name = fullName || [first, last].filter(Boolean).join(" ")
    if (name) return name
  }
  return fallbackName(email)
}

function asReactions(value: unknown): TocProjectChatReaction[] {
  return Array.isArray(value) ? (value as TocProjectChatReaction[]) : []
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const body = await request.json()
  const action = String(body.action || "edit")
  const admin = createAdminClient()

  const { data: previous, error: loadError } = await admin.from(TABLE).select("*").eq("id", id).single()
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  if (previous.deleted_at) return NextResponse.json({ error: "Cannot update a deleted message" }, { status: 400 })

  if (action === "react") {
    const emoji = String(body.emoji || "").trim()
    if (!REACTION_EMOJIS.includes(emoji)) return NextResponse.json({ error: "Unsupported reaction" }, { status: 400 })

    const name = await displayNameForUser(admin, auth.userId, auth.email)
    const current = asReactions(previous.reactions)
    const existing = current.find((reaction) => reaction.emoji === emoji && reaction.email.toLowerCase() === auth.email.toLowerCase())
    const reactions = existing
      ? current.filter((reaction) => !(reaction.emoji === emoji && reaction.email.toLowerCase() === auth.email.toLowerCase()))
      : [
          ...current,
          {
            emoji,
            email: auth.email.toLowerCase(),
            name,
            userId: auth.userId,
            createdAt: new Date().toISOString(),
          },
        ]

    const { data, error } = await admin.from(TABLE).update({ reactions }).eq("id", id).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: data })
  }

  const nextBody = String(body.body ?? "").trim()
  if (!nextBody) return NextResponse.json({ error: "message required" }, { status: 400 })

  const { data, error } = await admin
    .from(TABLE)
    .update({ body: nextBody, edited_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordTocProjectActivity(admin, {
    actionType: "chat.edited",
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: "edited a team chat message",
    details: { before: String(previous.body ?? "").slice(0, 500), after: nextBody.slice(0, 500) },
  })

  return NextResponse.json({ message: data })
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await ctx.params
  const admin = createAdminClient()
  const { data: previous } = await admin.from(TABLE).select("body").eq("id", id).single()
  const { data, error } = await admin.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordTocProjectActivity(admin, {
    actionType: "chat.deleted",
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: "deleted a team chat message",
    details: { message: String(previous?.body ?? "").slice(0, 500) },
  })

  return NextResponse.json({ message: data })
}
