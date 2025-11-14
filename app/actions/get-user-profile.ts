"use server"

import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function getUserProfile(userId: string) {
  try {
    console.log("[v0] Fetching profile for user:", userId)

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data, error } = await serviceSupabase.from("user_profiles").select("*").eq("user_id", userId).single()

    if (error) {
      console.error("[v0] Profile fetch error:", error)
      return null
    }

    console.log("[v0] Profile fetch success:", {
      role: data.role,
      is_admin: data.is_admin,
      school_id: data.school_id,
    })

    return data
  } catch (err) {
    console.error("[v0] Profile fetch exception:", err)
    return null
  }
}
