import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export type CollegeProgramOption = { program: string; state: string | null; division: string | null; coaches: number }

/**
 * Every program on the college coach list, for the messaging page's program picker - with its
 * division, state and how many reachable coaches it has.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Admin required" }, { status: 403 })

  const admin = createAdminClient()
  const load = (columns: string) =>
    admin.from("toc_college_coaches").select(columns).eq("opted_out", false).neq("status", "declined").limit(5000)
  // Division arrives with scripts/toc-college-coaches.sql; without it, programs still list.
  let { data, error } = await load("college_program, state, division")
  if (error) ({ data, error } = await load("college_program, state"))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byProgram = new Map<string, CollegeProgramOption>()
  for (const row of (data ?? []) as unknown as Array<{ college_program: string; state: string | null; division?: string | null }>) {
    const key = row.college_program?.trim()
    if (!key) continue
    const cur = byProgram.get(key) ?? { program: key, state: row.state ?? null, division: row.division ?? null, coaches: 0 }
    cur.coaches += 1
    cur.state ??= row.state ?? null
    cur.division ??= row.division ?? null
    byProgram.set(key, cur)
  }
  const programs = [...byProgram.values()].sort((a, b) => a.program.localeCompare(b.program))
  const divisions = [...new Set(programs.map((p) => p.division).filter(Boolean))].sort() as string[]
  const states = [...new Set(programs.map((p) => p.state).filter(Boolean))].sort() as string[]
  return NextResponse.json({ programs, divisions, states })
}
