import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"

export const dynamic = "force-dynamic"

type ActivityRollup = {
  last_activity_at: string | null
  last_activity_path: string | null
  last_activity_type: string | null
  activity_count_24h: number
  activity_count_7d: number
  activity_count_30d: number
  high_intent_count_30d: number
}

const emptyActivity = (): ActivityRollup => ({
  last_activity_at: null,
  last_activity_path: null,
  last_activity_type: null,
  activity_count_24h: 0,
  activity_count_7d: 0,
  activity_count_30d: 0,
  high_intent_count_30d: 0,
})

function isHighIntentActivity(eventType: string | null, pageUrl: string | null): boolean {
  const event = String(eventType ?? "")
  const path = String(pageUrl ?? "").toLowerCase()
  if (["profile_view", "card_click", "data_dawg_query", "ai_query"].includes(event)) return true
  return /\/(view-profile|admin\/data-dawg|data-dawg|blue|wallet|messaging|toc|fundraising|store)/.test(path)
}

export async function GET() {
  try {
    // Use cached auth check to reduce Supabase API calls
    const authCheck = await getCachedAdminCheck()
    
    if (authCheck.response) {
      return authCheck.response
    }

    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log("[v0] Fetching user profiles... (cached auth:", authCheck.user?.email, ")")

    console.log("[v0] Admin verified, fetching all users with service role...")

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Fetch ALL users by paginating through results
    let allAuthUsers: any[] = []
    let page = 1
    let hasMore = true
    const perPage = 1000 // Supabase max per page

    while (hasMore) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (authError) {
        console.error("[v0] Error fetching auth users:", authError)
        return NextResponse.json(
          {
            error: "Failed to fetch users",
            details: authError.message,
          },
          { status: 500 },
        )
      }

      if (authUsers.users && authUsers.users.length > 0) {
        allAuthUsers.push(...authUsers.users)
        console.log(`[v0] Fetched page ${page}: ${authUsers.users.length} users`)
        
        // Check if there are more pages
        if (authUsers.users.length < perPage) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }

    console.log(`[v0] Total auth users fetched: ${allAuthUsers.length}`)

    const profileSelectBase = `
        user_id, 
        full_name, 
        role, 
        profile_type, 
        cell_phone, 
        is_admin,
        verified_coach,
        verification_status,
        school_id,
        schools:school_id (
          name
        )
      `

    const withAthlete = await supabaseAdmin.from("user_profiles").select(
      `
        user_id, 
        full_name, 
        role, 
        profile_type, 
        cell_phone, 
        is_admin,
        verified_coach,
        verification_status,
        school_id,
        athlete_id,
        schools:school_id (
          name
        )
      `,
    )

    let userProfiles = withAthlete.data
    if (withAthlete.error && (withAthlete.error as { code?: string }).code === "42703") {
      const noAthlete = await supabaseAdmin.from("user_profiles").select(profileSelectBase)
      userProfiles = noAthlete.data
      if (noAthlete.error) {
        console.error("[v0] Error fetching user profiles (no athlete_id):", noAthlete.error)
      } else {
        console.warn("[v0] user_profiles.athlete_id missing; fetched profiles without athlete_id")
      }
    } else if (withAthlete.error) {
      console.error("[v0] Error fetching user profiles:", withAthlete.error)
    }

    // Create a map of user profiles for quick lookup
    const profileMap = new Map(userProfiles?.map((p) => [p.user_id, p]) || [])
    const activityByUser = new Map<string, ActivityRollup>()

    try {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const pageSize = 1000

      for (let pageStart = 0; pageStart < 10000; pageStart += pageSize) {
        const { data: activityRows, error: activityError } = await supabaseAdmin
          .from("user_analytics")
          .select("user_id, event_type, page_url, created_at")
          .not("user_id", "is", null)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .range(pageStart, pageStart + pageSize - 1)

        if (activityError) {
          console.warn("[v0] User activity rollup unavailable:", activityError.message)
          break
        }

        for (const row of activityRows ?? []) {
          const userId = String((row as { user_id?: string | null }).user_id ?? "")
          if (!userId) continue

          const createdAt = String((row as { created_at?: string | null }).created_at ?? "")
          const createdDate = new Date(createdAt)
          if (Number.isNaN(createdDate.getTime())) continue

          const rollup = activityByUser.get(userId) ?? emptyActivity()
          if (!rollup.last_activity_at) {
            rollup.last_activity_at = createdAt
            rollup.last_activity_path = (row as { page_url?: string | null }).page_url ?? null
            rollup.last_activity_type = (row as { event_type?: string | null }).event_type ?? null
          }

          rollup.activity_count_30d += 1
          if (createdDate >= sevenDaysAgo) rollup.activity_count_7d += 1
          if (createdDate >= oneDayAgo) rollup.activity_count_24h += 1
          if (
            isHighIntentActivity(
              (row as { event_type?: string | null }).event_type ?? null,
              (row as { page_url?: string | null }).page_url ?? null,
            )
          ) {
            rollup.high_intent_count_30d += 1
          }

          activityByUser.set(userId, rollup)
        }

        if (!activityRows || activityRows.length < pageSize) break
      }
    } catch (activityError) {
      console.warn("[v0] User activity rollup failed:", activityError)
    }

    // Combine auth users with profile data
    const combinedProfiles = allAuthUsers.map((user) => {
      const profile = profileMap.get(user.id)
      const activity = activityByUser.get(user.id) ?? emptyActivity()
      return {
        user_id: user.id,
        email: user.email || "",
        name: profile?.full_name || user.email?.split("@")[0] || "Unknown",
        full_name: profile?.full_name || user.email?.split("@")[0] || "Unknown",
        role: profile?.role || profile?.profile_type || "fan",
        cell_phone: profile?.cell_phone || null,
        is_admin: profile?.is_admin || false,
        verified_coach: profile?.verified_coach || false,
        verification_status: profile?.verification_status || null,
        school_id: profile?.school_id || null,
        school_name: profile?.schools?.name || null,
        athlete_id: (profile as { athlete_id?: string | null } | undefined)?.athlete_id ?? null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        ...activity,
      }
    })

    console.log(`[v0] Successfully fetched ${combinedProfiles.length} user profiles`)
    console.log(`[v0] Sample profile:`, combinedProfiles[0])

    return NextResponse.json({
      success: true,
      profiles: combinedProfiles,
      count: combinedProfiles.length,
    })
  } catch (error: any) {
    console.error("[v0] Exception in profiles API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
