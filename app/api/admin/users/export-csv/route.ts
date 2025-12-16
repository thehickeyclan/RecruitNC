import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"

export const dynamic = "force-dynamic"

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

    console.log("[Export CSV] Fetching user profiles for export... (cached auth:", authCheck.user?.email, ")")

    console.log("[Export CSV] Admin verified, fetching all users with service role...")

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
        console.error("[Export CSV] Error fetching auth users:", authError)
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
        console.log(`[Export CSV] Fetched page ${page}: ${authUsers.users.length} users`)
        
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

    console.log(`[Export CSV] Total auth users fetched: ${allAuthUsers.length}`)

    const { data: userProfiles, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select(`
        user_id, 
        cell_phone
      `)

    if (profileError) {
      console.error("[Export CSV] Error fetching user profiles:", profileError)
    }

    // Create a map of user profiles for quick lookup
    const profileMap = new Map(userProfiles?.map((p) => [p.user_id, p]) || [])

    // Combine auth users with profile data
    const combinedData = allAuthUsers.map((user) => {
      const profile = profileMap.get(user.id)
      return {
        email: user.email || "",
        cell_phone: profile?.cell_phone || "",
      }
    })

    // Generate CSV
    const headers = ["Email", "Cell Phone"]
    const csvRows = [
      headers.join(","),
      ...combinedData.map(row => 
        [
          `"${(row.email || "").replace(/"/g, '""')}"`,
          `"${(row.cell_phone || "").replace(/"/g, '""')}"`
        ].join(",")
      )
    ]

    const csv = csvRows.join("\n")

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error("[Export CSV] Exception:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

