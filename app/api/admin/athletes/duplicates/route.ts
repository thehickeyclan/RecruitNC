import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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

/** GET: List athlete groups that are potential duplicates (same name + graduation year). Admin only. */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

    const admin = createAdminClient()
    const { data: rows, error } = await admin
      .from("athletes")
      .select("id, name, firstname, lastname, firstName, lastName, graduationyear, highschool, photourl")
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const byKey = new Map<string, typeof rows>()
    for (const row of rows ?? []) {
      const r = row as Record<string, unknown>
      const name = getFullName(r)
      const gradYear = r.graduationyear != null ? String(r.graduationyear) : ""
      const key = `${normalizeName(name)}|${gradYear}`
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key)!.push(row)
    }

    const groups = Array.from(byKey.entries())
      .filter(([, athletes]) => athletes.length > 1)
      .map(([key, athletes]) => {
        const [nameNorm, gradYear] = key.split("|")
        const first = athletes[0] as Record<string, unknown>
        return {
          key,
          name: getFullName(first),
          graduationYear: gradYear,
          count: athletes.length,
          athletes: athletes.map((a) => {
            const x = a as Record<string, unknown>
            return {
              id: x.id,
              name: getFullName(x),
              highschool: x.highschool ?? null,
              photourl: x.photourl ?? null,
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
