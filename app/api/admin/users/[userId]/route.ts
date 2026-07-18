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
    const { name, cell_phone, role, verified_coach, school_id, college_id } = body

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

    // College coaches select from the canonical `colleges` table. Existing coach portals
    // still key off user_profiles.school_id, so resolve (or lazily create) the compatible
    // institution row here instead of ever writing a colleges.id into the school FK.
    let resolvedSchoolName: string | null | undefined
    if (college_id !== undefined) {
      if (!college_id) {
        updateData.school_id = null
        resolvedSchoolName = null
      } else {
        const { data: college, error: collegeError } = await supabaseAdmin
          .from("colleges")
          .select("id, name, logo_url")
          .eq("id", college_id)
          .maybeSingle()

        if (collegeError || !college) {
          return NextResponse.json({ error: "College not found" }, { status: 400 })
        }

        let { data: institution, error: institutionError } = await supabaseAdmin
          .from("schools")
          .select("id, name")
          .ilike("name", college.name)
          .limit(1)
          .maybeSingle()

        if (institutionError) {
          return NextResponse.json(
            { error: "Failed to resolve college assignment", details: institutionError.message },
            { status: 500 },
          )
        }

        if (!institution) {
          const inserted = await supabaseAdmin
            .from("schools")
            .insert({
              name: college.name,
              canonical_name: college.name,
              logo_url: college.logo_url || null,
              is_test: false,
              is_active: true,
              notes: "College institution created from canonical colleges table",
            })
            .select("id, name")
            .single()

          if (inserted.error || !inserted.data) {
            return NextResponse.json(
              { error: "Failed to create college portal assignment", details: inserted.error?.message },
              { status: 500 },
            )
          }
          institution = inserted.data
        }

        updateData.school_id = institution.id
        resolvedSchoolName = institution.name
      }
    }

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

    return NextResponse.json({
      success: true,
      profile: {
        ...data,
        ...(resolvedSchoolName !== undefined ? { school_name: resolvedSchoolName } : {}),
      },
    })
  } catch (error: any) {
    console.error("Exception in user update API:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
