import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { listNhscaDuals2026PaidOrders } from "@/lib/nhsca-duals-2026-registrations"

export const dynamic = "force-dynamic"

/**
 * GET: NHSCA Duals 2026 registrations for hub Payment → Past Orders.
 * Admins see all paid/pending registrations (both teams). Families see rows tied to their account or checkout email.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const admin = createAdminClient()

  let profile: { is_admin?: boolean; role?: string } | null = null
  if (user.id) {
    profile = (await admin
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
    if (!profile && user.email) {
      profile = (await admin
        .from("user_profiles")
        .select("is_admin, role")
        .ilike("email", user.email)
        .maybeSingle()).data as { is_admin?: boolean; role?: string } | null
    }
  }

  const isAdmin = !!profile?.is_admin || profile?.role === "admin"
  const eventParam = request.nextUrl.searchParams.get("event")?.trim() || null

  try {
    const orders = await listNhscaDuals2026PaidOrders(admin, {
      isAdmin,
      viewerUserId: user.id,
      viewerEmail: user.email,
      eventSlug: eventParam,
    })

    return NextResponse.json({
      orders,
      paidCount: orders.length,
      isAdmin,
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === "42P01") {
      return NextResponse.json(
        {
          error:
            "Registrations table missing. Run scripts/208-national-team-registrations-and-products.md in Supabase.",
        },
        { status: 503 }
      )
    }
    console.error("[national-team/hub/registrations]", error)
    return NextResponse.json({ error: "Failed to load registrations" }, { status: 500 })
  }
}
