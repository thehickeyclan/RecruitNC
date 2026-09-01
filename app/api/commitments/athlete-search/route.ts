import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Name lookup for the commitment form.
 *
 * Commitments used to be typed in free-hand — a name, a high school, a graduation year, all
 * re-keyed by whoever filled the form. That produced submissions that could not be matched back to
 * the athlete they belonged to, spelled differently from the profile that already existed.
 *
 * This returns only what the athlete directory at /athletes already shows publicly, so it exposes
 * nothing new; it exists so a commitment can point at an athlete row instead of describing one.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (q.length < 2) return NextResponse.json({ athletes: [] })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, weightclass, photourl")
    .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
    .eq("status", "active")
    .order("name")
    .limit(8)

  if (error) {
    console.error("[commitments/athlete-search]", error.message)
    return NextResponse.json({ athletes: [] }, { status: 500 })
  }

  return NextResponse.json({
    athletes: (data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      graduationYear: a.graduationyear ?? null,
      highSchool: a.highschool ?? null,
      weightClass: a.weightclass ?? null,
      photoUrl: a.photourl ?? null,
    })),
  })
}
