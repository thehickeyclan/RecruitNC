import { createClient } from "@/lib/supabase/server"
import { createAdminClientFresh } from "@/lib/supabase/admin"
import { buildUserProfileUpsertPayload } from "@/lib/user-profile-from-auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: rows, error: listError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (listError) {
      console.error("[api/profile] list user_profiles:", listError.code, listError.message)
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 })
    }

    let profileRow: Record<string, unknown> | null = rows?.[0] ?? null

    if (rows && rows.length > 1) {
      console.warn("[api/profile] multiple user_profiles rows for user_id", user.id, "count=", rows.length)
    }

    if (!profileRow) {
      console.warn("[api/profile] missing user_profiles row; upserting for user_id", user.id)
      try {
        const admin = createAdminClientFresh()
        const payload = buildUserProfileUpsertPayload(user)
        const { data: upserted, error: upsertError } = await admin
          .from("user_profiles")
          .upsert(payload, { onConflict: "user_id" })
          .select("*")
          .single()

        if (upsertError || !upserted) {
          console.error("[api/profile] ensure profile upsert failed:", upsertError?.code, upsertError?.message)
          return NextResponse.json({ error: "Profile not found" }, { status: 404 })
        }
        profileRow = upserted as Record<string, unknown>
      } catch (adminErr) {
        console.error("[api/profile] admin client unavailable for profile repair:", adminErr)
        return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      }
    }

    return NextResponse.json({
      ...profileRow,
      name: profileRow.full_name ?? profileRow.name ?? "",
    })
  } catch (error: unknown) {
    console.error("[api/profile] unexpected:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
