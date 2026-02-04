import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function normalize(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  const wrestling = (row.wrestling_name as string)?.trim()
  if (wrestling) return wrestling
  const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
  const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
  const combined = [first, last].filter(Boolean).join(" ").trim()
  return combined || ""
}

/**
 * Resolve display names to athlete IDs for a given graduation year.
 * GET /api/public-rankings/resolve-ids?year=2028&names=Jacob Perry,Aaron Ellison,...
 * Returns { "Jacob Perry": "uuid", ... } for each name that has a matching athlete.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || "2028"
    const namesParam = searchParams.get("names") || ""
    const requestedNames = namesParam
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)

    if (requestedNames.length === 0) {
      return NextResponse.json({ ids: {} })
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const yearNum = parseInt(year, 10)
    // Match year as number or string (DB may store 2028 or "2028")
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("*")
      .in("graduationyear", [yearNum, year])

    if (error) {
      console.error("[resolve-ids] Error:", error)
      return NextResponse.json({ ids: {}, error: error.message }, { status: 500 })
    }

    const byNormalized = new Map<string, { id: string }>()
    const byNameAndSchool = new Map<string, { id: string }>()
    for (const a of athletes || []) {
      const row = a as Record<string, unknown>
      const id = row.id as string
      if (!id) continue
      const full = getFullName(row)
      const n = normalize(full)
      const school = normalize((row.highschool as string) || "")
      if (n && !byNormalized.has(n)) {
        byNormalized.set(n, { id })
      }
      if (n && school) {
        const key = `${n}|${school}`
        if (!byNameAndSchool.has(key)) byNameAndSchool.set(key, { id })
      }
      const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
      const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
      if (first && last) {
        const alt = normalize(`${last} ${first}`)
        if (alt && !byNormalized.has(alt)) byNormalized.set(alt, { id })
      }
    }

    const ids: Record<string, string> = {}
    for (const key of requestedNames) {
      const parts = key.split("|").map((p) => p.trim())
      const namePart = parts[0] || ""
      const schoolPart = parts[1] ? normalize(parts[1]) : ""
      const n = normalize(namePart)
      // Prefer name+school match so "Jacob Perry|New Bern" finds the right one
      const found =
        (n && schoolPart && byNameAndSchool.get(`${n}|${schoolPart}`)) ||
        (n && byNormalized.get(n))
      if (found) ids[key] = found.id
    }

    return NextResponse.json({ ids })
  } catch (err) {
    console.error("[resolve-ids] Unexpected error:", err)
    return NextResponse.json(
      { ids: {}, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
