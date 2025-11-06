import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    console.log("[v0] Update pipeline stage API called")

    let supabase = await createClient()
    let user = null

    const {
      data: { user: cookieUser },
      error: cookieError,
    } = await supabase.auth.getUser()

    if (cookieUser) {
      user = cookieUser
      console.log("[v0] Cookie auth successful")
    } else {
      console.log("[v0] Cookie auth failed, trying bearer token")
      const authHeader = request.headers.get("authorization")

      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        )

        const {
          data: { user: tokenUser },
          error: tokenError,
        } = await supabase.auth.getUser()
        if (tokenUser) {
          user = tokenUser
          console.log("[v0] Bearer token auth successful")
        } else {
          console.log("[v0] Bearer token auth failed:", tokenError)
        }
      }
    }

    if (!user) {
      console.log("[v0] No user found - unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { starId, pipelineStage } = body

    if (!starId || !pipelineStage) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validStages = ["Prospect", "Contacted", "Recruiting", "Offered", "Committed", "Signed", "Lost"]
    if (!validStages.includes(pipelineStage)) {
      console.log("[v0] Invalid pipeline stage:", pipelineStage)
      return NextResponse.json({ error: "Invalid pipeline stage" }, { status: 400 })
    }

    console.log("[v0] Updating star:", starId, "to stage:", pipelineStage)

    const { error } = await supabase
      .from("college_coach_stars")
      .update({
        pipeline_stage: pipelineStage,
        last_contacted: pipelineStage === "Contacted" ? new Date().toISOString() : undefined,
      })
      .eq("id", starId)
      .eq("coach_user_id", user.id)

    if (error) {
      console.log("[v0] Database error:", error)
      throw error
    }

    console.log("[v0] Pipeline stage updated successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating pipeline stage:", error)
    return NextResponse.json({ error: "Failed to update pipeline stage" }, { status: 500 })
  }
}
