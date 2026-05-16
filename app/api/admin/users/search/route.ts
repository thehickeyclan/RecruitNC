import type { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/** Supabase Auth returns one page by default (~50 users); fundraising parent search must scan the full roster. */
const LIST_USERS_PAGE_SIZE = 1000
const LIST_USERS_MAX_PAGES = 50

async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>): Promise<User[]> {
  const all: User[] = []
  for (let page = 1; page <= LIST_USERS_MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_USERS_PAGE_SIZE })
    if (error) throw error
    all.push(...data.users)
    if (data.users.length < LIST_USERS_PAGE_SIZE) break
  }
  return all
}

type ProfileRow = {
  id?: string
  user_id?: string
  email?: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  role?: string | null
  school_id?: string | null
  institution?: string | null
}

/** Match email, display name, or separate first/last from profile or auth metadata (e.g. parent last name only). */
function userMatchesSearch(authUser: User, profile: ProfileRow | undefined, displayFullName: string, queryLower: string): boolean {
  if (!queryLower) return true
  const meta = authUser.user_metadata || {}
  const mf = typeof meta.first_name === "string" ? meta.first_name : ""
  const ml = typeof meta.last_name === "string" ? meta.last_name : ""
  const pf = profile?.first_name?.trim() || ""
  const pl = profile?.last_name?.trim() || ""
  const haystack = [
    authUser.email,
    profile?.email,
    displayFullName,
    profile?.full_name,
    pf,
    pl,
    `${pf} ${pl}`.trim(),
    mf,
    ml,
    `${mf} ${ml}`.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(queryLower)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const roleFilter = searchParams.get("role") || ""
    const queryTrim = query.trim()
    const queryLower = queryTrim.toLowerCase()

    if (!queryTrim) {
      return NextResponse.json({ users: [] })
    }

    const supabase = createAdminClient()

    const authUserList = await listAllAuthUsers(supabase)

    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, full_name, first_name, last_name, role, school_id, institution")

    if (profilesError) {
      console.error("[v0] Error fetching user profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    const profileList = (profiles ?? []) as ProfileRow[]

    const users = authUserList.map((authUser) => {
      const profile = profileList.find((p) => p.user_id === authUser.id)

      const fullName =
        profile?.full_name ||
        (authUser.user_metadata?.full_name as string | undefined) ||
        `${(authUser.user_metadata?.first_name as string | undefined) || ""} ${(authUser.user_metadata?.last_name as string | undefined) || ""}`.trim() ||
        authUser.email?.split("@")[0] ||
        "Unnamed User"

      return {
        id: authUser.id,
        user_id: authUser.id, // Add user_id for compatibility
        email: authUser.email,
        full_name: fullName,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        cell_phone: (profile as any)?.cell_phone || null,
        profile_image_url: (profile as any)?.profile_image_url || null,
        role: profile?.role || null,
        school_id: profile?.school_id || null,
        institution: profile?.institution || null,
        profile_id: profile?.id || null,
      }
    })

    const filteredUsers = users.filter((user, idx) => {
      const authUser = authUserList[idx]!
      const profile = profileList.find((p) => p.user_id === authUser.id)
      const matchesQuery = userMatchesSearch(authUser, profile, user.full_name, queryLower)
      // Apply role filter if specified
      const matchesRole = !roleFilter || user.role === roleFilter
      return matchesQuery && matchesRole
    })

    const capped = filteredUsers.slice(0, 40)
    console.log("[v0] Found users:", capped.length, filteredUsers.length > 40 ? `(trimmed from ${filteredUsers.length})` : "")

    return NextResponse.json({ users: capped })
  } catch (error: unknown) {
    console.error("[v0] Error in user search:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
