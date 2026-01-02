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

    // Build update object
    const updateData: any = {}
    if (name !== undefined) {
      updateData.name = name
      // Note: full_name column may not exist in all schema versions
      // If needed, add it via migration: ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
    }
    if (formattedPhone !== undefined) updateData.cell_phone = formattedPhone
    if (role !== undefined) updateData.role = role
    if (verified_coach !== undefined) updateData.verified_coach = verified_coach
    if (school_id !== undefined) updateData.school_id = school_id || null

    // Check if updateData is empty
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", params.userId)
      .select()
      .single()

    if (error) {
      console.error("Error updating user profile:", error)
      console.error("Update data:", updateData)
      console.error("User ID:", params.userId)
      return NextResponse.json(
        { 
          error: "Failed to update user profile",
          details: error.message,
          code: error.code
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
