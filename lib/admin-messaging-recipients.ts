import type { SupabaseClient } from "@supabase/supabase-js"

export type AdminMessagingRecipientRow = {
  user_id: string
  email: string | null
  display_name: string | null
  cell_phone: string | null
}

const COLLEGE_COACH_ROLES = new Set(["college_coach", "college-coach"])

export function isCollegeCoachRole(role: string | null | undefined): boolean {
  return COLLEGE_COACH_ROLES.has((role ?? "").trim().toLowerCase())
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
/** Addresses added to every TOC family send, so the owner can see what actually went out. */
const TOC_FAMILY_SEND_WATCHERS = ["thehickeyclan@gmail.com", "lisa.hickey@yahoo.com"] as const

export async function getAdminMessagingRecipients(
  admin: SupabaseClient,
  profileFilter: string | null,
  groupFilter: string | null,
  limit: number,
  excludeCollegeCoaches = false,
): Promise<AdminMessagingRecipientRow[]> {
  if (groupFilter?.startsWith("toc-college-coaches")) {
    const stateFilter = groupFilter.includes(":") ? groupFilter.split(":")[1] : null
    let query = admin.from("toc_college_coaches").select("id, coach_name, email, mobile_phone").eq("opted_out", false).neq("status", "declined").order("college_program").limit(limit)
    if (stateFilter === "NC-SC-TN-VA") query = query.in("state", ["NC", "SC", "TN", "VA"])
    else if (stateFilter) query = query.eq("state", stateFilter)
    const { data, error } = await query
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

  /**
   * Competing athletes and the families who registered them.
   *
   * Built live from confirmed invitations, not a saved list — a wrestler confirmed tomorrow is in
   * the audience without anyone remembering to add them. Emails come from the athlete record and
   * any linked parent account, deduplicated, because two wrestlers in one family share a payer and
   * should not receive the same message twice.
   */
  if (groupFilter === "toc-families") {
    const { data: invitations } = await admin
      .from("toc_invitations")
      .select("athlete_id")
      .eq("status", "confirmed")
      .limit(limit)

    const athleteIds = [...new Set((invitations ?? []).map((r) => (r as { athlete_id: string }).athlete_id).filter(Boolean))]
    if (athleteIds.length === 0) return []

    // Batched: `.in()` with several hundred ids has been known to come back empty here.
    const athletes: { id: string; name: string | null; contactEmail: string | null }[] = []
    for (let i = 0; i < athleteIds.length; i += 50) {
      const { data } = await admin
        .from("athletes")
        .select("id, name, contactEmail")
        .in("id", athleteIds.slice(i, i + 50))
      athletes.push(...((data ?? []) as typeof athletes))
    }

    const links: { athlete_id: string; user_id: string }[] = []
    for (let i = 0; i < athleteIds.length; i += 50) {
      const { data } = await admin
        .from("parent_athlete_links")
        .select("athlete_id, user_id")
        .in("athlete_id", athleteIds.slice(i, i + 50))
      links.push(...((data ?? []) as typeof links))
    }

    const parentUserIds = [...new Set(links.map((l) => l.user_id).filter(Boolean))]
    const parentEmailByUser = new Map<string, string>()
    for (let i = 0; i < parentUserIds.length; i += 50) {
      const { data } = await admin
        .from("user_profiles")
        .select("user_id, email")
        .in("user_id", parentUserIds.slice(i, i + 50))
      for (const p of (data ?? []) as { user_id: string; email: string | null }[]) {
        if (p.email?.trim()) parentEmailByUser.set(p.user_id, p.email.trim().toLowerCase())
      }
    }

    const rows: AdminMessagingRecipientRow[] = []
    const seen = new Set<string>()
    const add = (email: string | null | undefined, name: string | null, key: string) => {
      const clean = email?.trim().toLowerCase()
      if (!clean || seen.has(clean)) return
      seen.add(clean)
      rows.push({ user_id: `toc-family:${key}`, email: clean, display_name: name, cell_phone: null })
    }

    for (const athlete of athletes) {
      add(athlete.contactEmail, athlete.name, athlete.id)
      for (const link of links.filter((l) => l.athlete_id === athlete.id)) {
        add(parentEmailByUser.get(link.user_id), athlete.name, `${athlete.id}:${link.user_id}`)
      }
    }

    // Always included so a send can be confirmed from the inbox rather than assumed.
    for (const watcher of TOC_FAMILY_SEND_WATCHERS) add(watcher, "NC United", `watcher:${watcher}`)

    return rows
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
    ? await admin.from("user_profiles").select("user_id, email, full_name, cell_phone, role").eq("role", profileFilter)
    : await admin.from("user_profiles").select("user_id, email, full_name, cell_phone, role")

  if (profileError) return []

  const eligibleProfileRows = excludeCollegeCoaches
    ? (profileRows ?? []).filter((row: { role?: string | null }) => !isCollegeCoachRole(row.role))
    : (profileRows ?? [])

  const profileUserIds = new Set(eligibleProfileRows.map((r: { user_id: string }) => r.user_id))
  if (userIds.size > 0) userIds = new Set([...userIds].filter((id) => profileUserIds.has(id)))
  else userIds = profileUserIds

  const idList = [...userIds].slice(0, limit)
  if (idList.length === 0) return []

  const byId = new Map<string, AdminMessagingRecipientRow>()

  // Seed from the first query when we already have full rows (no group filter path).
  if (!groupFilter) {
    for (const r of eligibleProfileRows) {
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
