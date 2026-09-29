import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"

export const dynamic = "force-dynamic"

/**
 * The wrestlers this account is tied to, and a name search for finding one to add.
 *
 * College-interest alerts go to the family of the wrestler a program looked at, which means the
 * family has to be linked to the wrestler. The app's athlete screen already offers "This is me" /
 * "I'm the parent"; what it lacked was a way to find your wrestler without scrolling the commits
 * or rankings. GET returns the links; GET ?q= also returns up to 15 matches, each marked if linked.
 */
type Linked = { id: string; name: string; classYear: number | null; school: string | null; relationship: "self" | "parent" }

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to see your wrestlers." }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: claimed }, { data: links }] = await Promise.all([
    admin.from("athletes").select("id, name, graduationyear, highschool").eq("claimed_by_user_id", userId),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId),
  ])

  const parentIds = (links ?? []).map((l) => String((l as { athlete_id: string }).athlete_id))
  const { data: parentRows } = parentIds.length
    ? await admin.from("athletes").select("id, name, graduationyear, highschool").in("id", parentIds)
    : { data: [] as Array<Record<string, unknown>> }

  const byId = new Map<string, Linked>()
  const add = (row: Record<string, unknown>, relationship: Linked["relationship"]) => {
    const id = String(row.id)
    if (byId.has(id)) return
    byId.set(id, {
      id,
      name: String(row.name ?? "Athlete"),
      classYear: row.graduationyear == null ? null : Number(row.graduationyear),
      school: (row.highschool as string | null) ?? null,
      relationship,
    })
  }
  for (const row of claimed ?? []) add(row as Record<string, unknown>, "self")
  for (const row of parentRows ?? []) add(row as Record<string, unknown>, "parent")
  const linked = [...byId.values()]

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  let results: Array<{ id: string; name: string; classYear: number | null; school: string | null; linked: boolean }> = []
  if (q.length >= 2) {
    const { data } = await admin
      .from("athletes")
      .select("id, name, graduationyear, highschool")
      .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
      .order("graduationyear", { ascending: true })
      .limit(15)
    results = (data ?? []).map((a) => ({
      id: String(a.id),
      name: String(a.name ?? "Athlete"),
      classYear: a.graduationyear == null ? null : Number(a.graduationyear),
      school: (a.highschool as string | null) ?? null,
      linked: byId.has(String(a.id)),
    }))
  }

  return NextResponse.json({ linked, results })
}
