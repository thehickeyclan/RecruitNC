import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin access required" }
  return { ok: true as const }
}

function formatAccomplishments(achievements: string[] | string | null, additionalAchievements: string | null): string {
  const acc: string[] = []
  const raw = Array.isArray(achievements)
    ? achievements
    : typeof achievements === "string"
      ? achievements.split(",").map((s) => s.trim()).filter(Boolean)
      : []
  const lower = raw.map((s) => s.toLowerCase())
  if (lower.some((s) => s.includes("all american") || s.includes("all-american"))) acc.push("All American")
  if (lower.some((s) => s.includes("state champion"))) acc.push("State Champion")
  if (lower.some((s) => s.includes("state placer"))) acc.push("State Placer")
  if (lower.some((s) => s.includes("state qualifier"))) acc.push("SQ")
  if (additionalAchievements && additionalAchievements.trim()) {
    acc.push(additionalAchievements.trim())
  }
  return acc.join(", ") || "—"
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2026"
    const yearNum = parseInt(year, 10)
    if (isNaN(yearNum)) return NextResponse.json({ ok: false, error: "Invalid year" }, { status: 400 })

    const admin = createAdminClient()
    const { data: athletes, error } = await admin
      .from("athletes")
      .select(`
        id,
        name,
        weightclass,
        college,
        highschool,
        cell,
        cell_number,
        phone,
        academic_gpa,
        achievements,
        additional_achievements
      `)
      .eq("graduationyear", yearNum)
      .not("college", "is", null)
      .neq("college", "")
      .neq("college", "Uncommitted")
      .neq("college", "TBD")
      .order("weightclass", { ascending: true })
      .order("name", { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    const rows = (athletes || []).map((a: any) => ({
      id: a.id,
      name: a.name || "",
      weight: a.weightclass || a.weight_class || "—",
      college: a.college || "—",
      highschool: a.highschool || a.high_school || "—",
      cell: a.cell || a.cell_number || a.phone || "—",
      gpa: a.academic_gpa != null ? String(a.academic_gpa) : "—",
      accomplishments: formatAccomplishments(a.achievements, a.additional_achievements),
    }))

    const res = NextResponse.json({ ok: true, year: yearNum, athletes: rows })
    res.headers.set("Cache-Control", "no-store, max-age=0")
    return res
  } catch (err) {
    console.error("[college-recruiting-guide]", err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
