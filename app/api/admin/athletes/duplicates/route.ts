import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

function normalizeName(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
  const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
  return [first, last].filter(Boolean).join(" ").trim() || ""
}

function getGradYear(row: Record<string, unknown>): string {
  const v = row.graduationyear ?? row.graduation_year
  return v != null ? String(v) : ""
}

/** GET: List athlete groups that are potential duplicates (same name + graduation year). Admin only. */
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      console.error("[admin/athletes/duplicates] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }
    const cookieStore = cookies()
    const supabase = createServerClient(url, serviceKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const { data: rawRows, error } = await supabase
      .from("athletes")
      .select("*")
      .order("graduationyear", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })

    if (error) {
      console.error("[admin/athletes/duplicates] select error:", error.message, error.code)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = rawRows ?? []
    const byKey = new Map<string, typeof rows>()
    for (const row of rows) {
      const r = row as Record<string, unknown>
      const name = getFullName(r)
      const gradYear = getGradYear(r)
      const key = `${normalizeName(name)}|${gradYear}`
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key)!.push(row)
    }

    const groups = Array.from(byKey.entries())
      .filter(([, aths]) => aths.length > 1)
      .map(([key, aths]) => {
        const first = aths[0] as Record<string, unknown>
        return {
          key,
          name: getFullName(first),
          graduationYear: key.split("|")[1] ?? "",
          count: aths.length,
          athletes: aths.map((a) => {
            const x = a as Record<string, unknown>
            return {
              id: x.id,
              name: getFullName(x),
              highschool: (x.highschool ?? x.high_school) ?? null,
            }
          }),
        }
      })

    return NextResponse.json({
      groups,
      totalDuplicateProfiles: groups.reduce((s, g) => s + g.count, 0),
      totalGroups: groups.length,
    })
  } catch (e) {
    console.error("[admin/athletes/duplicates]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
