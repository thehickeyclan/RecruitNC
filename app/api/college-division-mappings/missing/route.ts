import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET: list college names that appear in athletes.college but have no row in college_division_mappings.
 * Single source of truth is college_division_mappings — add these in Supabase to fix "Unknown".
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: athletes } = await supabase
      .from("athletes")
      .select("college")
      .not("college", "is", null)

    const collegeFromAthletes = new Set<string>()
    for (const row of athletes ?? []) {
      const c = (row.college ?? "").toString().trim()
      if (c) collegeFromAthletes.add(c)
    }

    const { data: mappings } = await supabase
      .from("college_division_mappings")
      .select("college_name")

    const inTable = new Set(
      (mappings ?? []).map((r) => (r.college_name ?? "").toString().trim().toLowerCase()),
    )

    const missing: string[] = []
    for (const name of collegeFromAthletes) {
      const key = name.toLowerCase()
      const hasExact = inTable.has(key)
      const hasPartial = [...inTable].some((t) => key.includes(t) || t.includes(key))
      if (!hasExact && !hasPartial) missing.push(name)
    }

    missing.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))

    return NextResponse.json({
      missing,
      totalInAthletes: collegeFromAthletes.size,
      totalInTable: inTable.size,
    })
  } catch (e) {
    console.error("[college-division-mappings/missing]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load missing colleges" },
      { status: 500 },
    )
  }
}
