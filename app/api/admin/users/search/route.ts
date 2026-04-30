import type { User } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
    const queryLower = query.trim().toLowerCase()

    console.log("[v0] Searching users with query:", query)

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error("[v0] Error fetching auth users:", authError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, full_name, first_name, last_name, role, school_id, institution")

    if (profilesError) {
      console.error("[v0] Error fetching user profiles:", profilesError)
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }

    const profileList = (profiles ?? []) as ProfileRow[]

    const users = authUsers.users.map((authUser) => {
      const profile = profileList.find((p) => p.user_id === authUser.id)

      const fullName =
        profile?.full_name ||
        (authUser.user_metadata?.full_name as string | undefined) ||
        `${(authUser.user_metadata?.first_name as string | undefined) || ""} ${(authUser.user_metadata?.last_name as string | undefined) || ""}`.trim() ||
        authUser.email?.split("@")[0] ||
        "Unnamed User"

      return {
        id: authUser.id,
        email: authUser.email,
        full_name: fullName,
        role: profile?.role || null,
        school_id: profile?.school_id || null,
        institution: profile?.institution || null,
        profile_id: profile?.id || null,
      }
    })

    const filteredUsers = queryLower
      ? users.filter((user, idx) => {
          const authUser = authUsers.users[idx]!
          const profile = profileList.find((p) => p.user_id === authUser.id)
          return userMatchesSearch(authUser, profile, user.full_name, queryLower)
        })
      : users

    console.log("[v0] Found users:", filteredUsers.length)

    return NextResponse.json({ users: filteredUsers })
  } catch (error: unknown) {
    console.error("[v0] Error in user search:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
