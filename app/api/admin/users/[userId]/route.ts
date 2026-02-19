import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { normalizePhoneForStorage } from "@/lib/phone-format"

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

    const formattedPhone = cell_phone !== undefined ? normalizePhoneForStorage(cell_phone) : undefined

    // Build update object - match original working pattern
    const updateData: any = {}
    if (name !== undefined) updateData.full_name = name
    if (formattedPhone !== undefined) updateData.cell_phone = formattedPhone
    if (role !== undefined) updateData.role = role
    if (verified_coach !== undefined) updateData.verified_coach = verified_coach
    if (school_id !== undefined) updateData.school_id = school_id || null

    // Check if profile exists, if not create it
    let existingProfile = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, email, full_name")
      .eq("user_id", params.userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("[API] Error checking profile:", error)
          return null
        }
        return data
      })

    // If profile doesn't exist, get user from auth and create profile
    if (!existingProfile) {
      console.log("[API] Profile not found, checking auth.users and creating profile...")
      
      // Get user from auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(params.userId)
      
      if (authError || !authUser?.user) {
        console.error("[API] User not found in auth.users:", authError)
        return NextResponse.json(
          { 
            error: "User not found",
            details: `No user found for user_id: ${params.userId}`
          },
          { status: 404 }
        )
      }

      // Create the profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          user_id: params.userId,
          email: authUser.user.email || "",
          full_name: name || authUser.user.email?.split("@")[0] || "Unknown",
          role: role || "other"
        })
        .select()
        .single()

      if (createError) {
        console.error("[API] Error creating profile:", createError)
        return NextResponse.json(
          { 
            error: "Failed to create user profile",
            details: createError.message
          },
          { status: 500 }
        )
      }

      existingProfile = newProfile
      console.log("[API] Created new profile for user:", authUser.user.email)
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
