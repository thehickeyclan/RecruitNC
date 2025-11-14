import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] ===== RECENT COMMITS API CALLED =====")
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("[v0] Auth check:", { userId: user?.id, authError })

    if (authError || !user) {
      console.log("[v0] No user found - unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dateString = sevenDaysAgo.toISOString().split("T")[0]

    console.log("[v0] Fetching commits since:", dateString)

    const { data, error } = await supabase
      .from("athletes")
      .select("*")
      .not("college", "is", null)
      .not("commitmentdate", "is", null)
      .gte("commitmentdate", dateString)
      .order("commitmentdate", { ascending: false })
      .limit(6)

    console.log("[v0] Query result:", { count: data?.length, error: error?.message })

    if (error) {
      console.error("[v0] Error fetching recent commits:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const commits = (data || []).map((athlete: any) => ({
      id: athlete.id,
      name: athlete.wrestling_name || athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim(),
      graduation_year: athlete.graduation_year || athlete.graduationyear,
      weightclass: athlete.weightclass,
      photourl: athlete.photourl,
      college: athlete.college,
      commitmentdate: athlete.commitmentdate,
    }))

    console.log("[v0] Returning", commits.length, "recent commits")
    return NextResponse.json({ commits })
  } catch (error: any) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
