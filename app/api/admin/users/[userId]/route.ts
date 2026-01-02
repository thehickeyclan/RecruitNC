import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", session.user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { name, cell_phone, role, verified_coach, school_id } = body

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

    // Format phone number if provided
    let formattedPhone = cell_phone
    if (cell_phone) {
      const cleaned = cell_phone.replace(/\D/g, "")
      if (cleaned.length === 10) {
        formattedPhone = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      } else if (cleaned.length === 11 && cleaned[0] === "1") {
        formattedPhone = `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
      }
    }

    // Build update object - match original working pattern
    const updateData: any = {}
    if (name !== undefined) updateData.full_name = name
    if (formattedPhone !== undefined) updateData.cell_phone = formattedPhone
    if (role !== undefined) updateData.role = role
    if (verified_coach !== undefined) updateData.verified_coach = verified_coach
    if (school_id !== undefined) updateData.school_id = school_id || null

    // First verify the profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", params.userId)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking user profile:", checkError)
      return NextResponse.json(
        { 
          error: "Failed to check user profile",
          details: checkError.message
        },
        { status: 500 }
      )
    }

    if (!existingProfile) {
      console.error("Profile not found for user_id:", params.userId)
      return NextResponse.json(
        { 
          error: "User profile not found",
          details: `No profile found for user_id: ${params.userId}. The user may need to sign in first to create their profile.`
        },
        { status: 404 }
      )
    }

    // Update the profile
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", params.userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating user profile:", {
        error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        updateData,
        userId: params.userId
      })
      return NextResponse.json(
        { 
          error: "Failed to update user profile",
          details: error.message || error.details || "Unknown error",
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error: any) {
    console.error("Exception in user update API:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
