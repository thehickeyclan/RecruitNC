import type { SupabaseClient } from "@supabase/supabase-js"

export type AdminMessagingRecipientRow = {
  user_id: string
  email: string | null
  display_name: string | null
  cell_phone: string | null
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Resolve login email from auth when `user_profiles.email` is empty. */
async function fetchAuthEmailsByUserId(admin: SupabaseClient, userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const part of chunk(userIds, 50)) {
    await Promise.all(
      part.map(async (userId) => {
        try {
          const { data } = await admin.auth.admin.getUserById(userId)
          const email = data?.user?.email?.trim()
          if (email) out.set(userId, email)
        } catch {
          // skip
        }
      }),
    )
  }
  return out
}

/**
 * Audience for Mass Email — same logic as GET /api/admin/messaging/recipients.
 * Loads profile rows in batches (`.in()` with 700+ ids often returns nothing).
 */
export async function getAdminMessagingRecipients(admin: SupabaseClient, profileFilter: string | null, groupFilter: string | null, limit: number): Promise<AdminMessagingRecipientRow[]> {
  if (groupFilter === "toc-college-coaches") {
    const { data, error } = await admin.from("toc_college_coaches").select("id, coach_name, email, mobile_phone").eq("opted_out", false).neq("status", "declined").order("college_program").limit(limit)
    if (error) {
      console.error("[admin-messaging-recipients] college coaches:", error.message)
      return []
    }
    return (data ?? []).map((row) => ({
      user_id: `toc-college-coach:${row.id}`,
      email: row.email?.trim() || null,
      display_name: row.coach_name ?? null,
      cell_phone: row.mobile_phone ?? null,
    }))
  }

  let userIds = new Set<string>()

  if (groupFilter) {
    const groupIds = new Set<string>()
    if (groupFilter === "blue") {
      const { data: blueRows } = await admin.from("blue_memberships").select("payer_user_id").eq("status", "active")
      for (const r of blueRows ?? []) {
        const uid = (r as { payer_user_id: string | null }).payer_user_id
        if (uid) groupIds.add(uid)
      }
    } else if (groupFilter.startsWith("event:")) {
      const eventSlug = groupFilter.slice("event:".length)
      const { data: workspaceRows } = await admin.from("event_workspace_members").select("user_id").eq("event_slug", eventSlug)
      for (const r of workspaceRows ?? []) groupIds.add((r as { user_id: string }).user_id)
      const { data: regs } = await admin.from("national_team_event_registrations").select("parent_email, parent_user_id").eq("event_slug", eventSlug).eq("status", "paid")
      for (const r of regs ?? []) {
        const row = r as {
          parent_user_id: string | null
          parent_email: string | null
        }
        if (row.parent_user_id) groupIds.add(row.parent_user_id)
        else if (row.parent_email?.trim()) {
          const { data: up } = await admin.from("user_profiles").select("user_id").ilike("email", row.parent_email.trim()).limit(1).maybeSingle()
          if (up?.user_id) groupIds.add((up as { user_id: string }).user_id)
        }
      }
    } else if (groupFilter.startsWith("forum:")) {
      const groupId = groupFilter.slice("forum:".length)
      const { data: memberRows } = await admin.from("forum_members").select("user_id").eq("group_id", groupId)
      for (const r of memberRows ?? []) groupIds.add((r as { user_id: string }).user_id)
    }
    userIds = groupIds
  }

  const byRole = profileFilter && profileFilter.toLowerCase() !== "all"
  const { data: profileRows, error: profileError } = byRole
    ? await admin.from("user_profiles").select("user_id, email, full_name, cell_phone").eq("role", profileFilter)
    : await admin.from("user_profiles").select("user_id, email, full_name, cell_phone")

  if (profileError) return []

  const profileUserIds = new Set((profileRows ?? []).map((r: { user_id: string }) => r.user_id))
  if (userIds.size > 0) userIds = new Set([...userIds].filter((id) => profileUserIds.has(id)))
  else userIds = profileUserIds

  const idList = [...userIds].slice(0, limit)
  if (idList.length === 0) return []

  const byId = new Map<string, AdminMessagingRecipientRow>()

  // Seed from the first query when we already have full rows (no group filter path).
  if (!groupFilter && profileRows) {
    for (const r of profileRows) {
      const row = r as {
        user_id: string
        email: string | null
        full_name: string | null
        cell_phone: string | null
      }
      if (!idList.includes(row.user_id)) continue
      byId.set(row.user_id, {
        user_id: row.user_id,
        email: row.email?.trim() || null,
        display_name: row.full_name ?? null,
        cell_phone: row.cell_phone ?? null,
      })
    }
  }

  // Group-filter path: load contact fields in batches (large `.in()` lists fail silently).
  const missingIds = idList.filter((id) => !byId.has(id))
  if (missingIds.length > 0) {
    for (const part of chunk(missingIds, 100)) {
      const { data: rows, error } = await admin.from("user_profiles").select("user_id, email, full_name, cell_phone").in("user_id", part)
      if (error) {
        console.error("[admin-messaging-recipients] batch load:", error.message)
        continue
      }
      for (const r of rows ?? []) {
        const row = r as {
          user_id: string
          email: string | null
          full_name: string | null
          cell_phone: string | null
        }
        byId.set(row.user_id, {
          user_id: row.user_id,
          email: row.email?.trim() || null,
          display_name: row.full_name ?? null,
          cell_phone: row.cell_phone ?? null,
        })
      }
    }
  }

  const needAuth = idList.filter((id) => !byId.get(id)?.email?.trim())
  if (needAuth.length > 0) {
    const authEmails = await fetchAuthEmailsByUserId(admin, needAuth)
    for (const userId of needAuth) {
      const authEmail = authEmails.get(userId)
      if (!authEmail) continue
      const existing = byId.get(userId)
      byId.set(userId, {
        user_id: userId,
        email: authEmail,
        display_name: existing?.display_name ?? null,
        cell_phone: existing?.cell_phone ?? null,
      })
    }
  }

  return idList.map(
    (id) =>
      byId.get(id) ?? {
        user_id: id,
        email: null,
        display_name: null,
        cell_phone: null,
      },
  )
}

export function countRecipientsWithEmail(recipients: AdminMessagingRecipientRow[]): number {
  return recipients.filter((r) => r.email?.trim()).length
}
