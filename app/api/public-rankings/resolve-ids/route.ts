import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function normalize(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

/**
 * Resolve display names to athlete IDs for a given graduation year.
 * GET /api/public-rankings/resolve-ids?year=2028&names=Jacob Perry,Aaron Ellison,...
 * Returns { "Jacob Perry": "uuid", "Aaron Ellison": "uuid", ... } for each name that has a matching athlete.
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

    const yearNum = parseInt(year, 10) || year
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, firstname, lastname, wrestling_name")
      .eq("graduationyear", yearNum)

    if (error) {
      console.error("[resolve-ids] Error:", error)
      return NextResponse.json({ ids: {}, error: error.message }, { status: 500 })
    }

    // Build map: normalized full name -> { id, canonicalName } (keep first match)
    const byNormalized = new Map<string, { id: string; canonicalName: string }>()
    for (const a of athletes || []) {
      const row = a as Record<string, unknown>
      const id = row.id as string
      const full =
        (row.name as string)?.trim() ||
        (row.wrestling_name as string)?.trim() ||
        [row.firstname ?? row.firstName, row.lastname ?? row.lastName].filter(Boolean).join(" ").trim() ||
        ""
      const normalized = normalize(full)
      if (normalized && id && !byNormalized.has(normalized)) {
        byNormalized.set(normalized, { id, canonicalName: full })
      }
    }

    // For each requested name, return id if we have a match (normalized)
    const ids: Record<string, string> = {}
    for (const name of requestedNames) {
      const n = normalize(name)
      const found = byNormalized.get(n)
      if (found) ids[name] = found.id
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
