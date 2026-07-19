import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordTocProjectActivity } from "@/lib/toc/project-activity"
import { requireTocInvitationManager } from "@/lib/toc/require-toc-invitation-manager"
import type { TocProjectChatMention } from "@/lib/toc/project-plan"

export const dynamic = "force-dynamic"

const TABLE = "toc_project_chat_messages"

type ChatRow = {
  id: string
  body: string
  author_email: string
  author_user_id: string | null
  mentions?: TocProjectChatMention[]
  created_at: string
}

function tableMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205" || String(error?.message ?? "").includes(TABLE)
}

function emailFallbackName(email: string): string {
  const local = email.split("@")[0] || email
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function profileName(row: Record<string, unknown>): string | null {
  const fullName = String(row.full_name ?? "").trim()
  const first = String(row.first_name ?? "").trim()
  const last = String(row.last_name ?? "").trim()
  return fullName || [first, last].filter(Boolean).join(" ") || null
}

async function enrichMessages(admin: ReturnType<typeof createAdminClient>, messages: ChatRow[]) {
  const userIds = [...new Set(messages.map((row) => row.author_user_id).filter(Boolean))] as string[]
  const emails = [...new Set(messages.map((row) => row.author_email).filter(Boolean).map((email) => email.toLowerCase()))]
  const namesByUserId = new Map<string, string>()
  const namesByEmail = new Map<string, string>()

  const columns = "user_id,email,full_name,first_name,last_name"
  if (userIds.length > 0) {
    const { data } = await admin.from("user_profiles").select(columns).in("user_id", userIds)
    ;(data ?? []).forEach((row) => {
      const record = row as Record<string, unknown>
      const name = profileName(record)
      const userId = String(record.user_id ?? "")
      const email = String(record.email ?? "").toLowerCase()
      if (name && userId) namesByUserId.set(userId, name)
      if (name && email) namesByEmail.set(email, name)
    })
  }
  if (emails.length > 0) {
    const { data } = await admin.from("user_profiles").select(columns).in("email", emails)
    ;(data ?? []).forEach((row) => {
      const record = row as Record<string, unknown>
      const name = profileName(record)
      const email = String(record.email ?? "").toLowerCase()
      const userId = String(record.user_id ?? "")
      if (name && userId) namesByUserId.set(userId, name)
      if (name && email) namesByEmail.set(email, name)
    })
  }

  return messages.map((message) => ({
    ...message,
    author_name:
      (message.author_user_id ? namesByUserId.get(message.author_user_id) : null) ||
      namesByEmail.get(message.author_email.toLowerCase()) ||
      emailFallbackName(message.author_email),
  }))
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function mentionAliases(user: TocProjectChatMention): string[] {
  const name = user.name.trim()
  const parts = name.split(/\s+/).filter(Boolean)
  const local = user.email.split("@")[0].replace(/[._-]+/g, " ")
  return [
    name,
    parts[0] ?? "",
    parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : "",
    local,
    user.email,
  ].filter(Boolean)
}

async function tocMentionUsers(admin: ReturnType<typeof createAdminClient>): Promise<TocProjectChatMention[]> {
  const { data: managerRows } = await admin.from("toc_invitation_managers").select("email").limit(100)
  const emails = [...new Set((managerRows ?? []).map((row) => String(row.email ?? "").trim().toLowerCase()).filter(Boolean))]
  if (emails.length === 0) return []

  const { data: profiles } = await admin.from("user_profiles").select("user_id,email,full_name,first_name,last_name").in("email", emails)
  const byEmail = new Map<string, Record<string, unknown>>()
  ;(profiles ?? []).forEach((row) => {
    const record = row as Record<string, unknown>
    const email = String(record.email ?? "").trim().toLowerCase()
    if (email) byEmail.set(email, record)
  })

  return emails.map((email) => {
    const profile = byEmail.get(email)
    const name = profile ? profileName(profile) || emailFallbackName(email) : emailFallbackName(email)
    return {
      name,
      email,
      userId: profile ? String(profile.user_id ?? "") || null : null,
    }
  })
}

async function resolveMentions(admin: ReturnType<typeof createAdminClient>, message: string): Promise<TocProjectChatMention[]> {
  const users = await tocMentionUsers(admin)
  const found = new Map<string, TocProjectChatMention>()
  for (const user of users) {
    const aliases = mentionAliases(user).filter(Boolean)
    for (const alias of aliases) {
      const pattern = new RegExp(`(^|\\s)@${escapeRegex(alias)}(?=\\s|[.,!?;:]|$)`, "i")
      if (pattern.test(message)) {
        found.set(user.email, user)
        break
      }
    }
  }
  return [...found.values()]
}

export async function GET(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  if (searchParams.get("mentions") === "1") {
    return NextResponse.json({ users: await tocMentionUsers(admin) })
  }

  const { data, error } = await admin.from(TABLE).select("*").order("created_at", { ascending: false }).limit(75)
  if (error) {
    if (tableMissing(error)) {
      return NextResponse.json({
        unavailable: true,
        setupSql: "docs/sql/toc-project-plan.sql",
        messages: [],
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const messages = await enrichMessages(admin, ((data ?? []) as ChatRow[]).reverse())
  return NextResponse.json({ messages })
}

export async function POST(request: Request) {
  const auth = await requireTocInvitationManager()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const message = String(body.body ?? "").trim()
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 })

  const admin = createAdminClient()
  const mentions = await resolveMentions(admin, message)
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      body: message,
      author_email: auth.email,
      author_user_id: auth.userId,
      mentions,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordTocProjectActivity(admin, {
    actionType: "chat.message",
    actorEmail: auth.email,
    actorUserId: auth.userId,
    summary: "posted a team chat message",
    details: { message: message.slice(0, 500), mentions },
  })

  const [enrichedMessage] = await enrichMessages(admin, [data as ChatRow])
  return NextResponse.json({ message: enrichedMessage })
}
