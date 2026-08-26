import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Name search across every RecruitNC athlete, for the corner coach form.
 *
 * Deliberately not limited to the Tournament of Champions field: a search that only matched
 * invited wrestlers would answer "is this athlete going to TOC?" for anyone who cared to type a
 * name. Searching everybody reveals nothing about the field, and returns only what the public
 * athlete directory already shows.
 */

export const dynamic = "force-dynamic"

const MIN_QUERY = 2
const LIMIT = 10

export async function GET(request: NextRequest) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (query.length < MIN_QUERY) return NextResponse.json({ athletes: [] })

  // Escape the wildcards so a query of "%" cannot list the directory.
  const safe = query.replace(/[%_]/g, "")
  if (!safe) return NextResponse.json({ athletes: [] })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("athletes")
    .select("id, name, highschool, graduationyear, wrestlingClub, birthdate")
    .ilike("name", `%${safe}%`)
    .order("name")
    .limit(LIMIT)

  if (error) {
    console.error("[toc athlete-lookup]", error.message)
    return NextResponse.json({ athletes: [] }, { status: 500 })
  }

  return NextResponse.json({
    athletes: (data ?? []).map((a) => ({
      id: a.id,
      name: a.name ?? "—",
      highSchool: a.highschool ?? null,
      graduationYear: a.graduationyear ?? null,
      // What the form should ask for. The values themselves are not returned — the form needs to
      // know a gap exists, not what is already on file.
      needsClub: !String(a.wrestlingClub ?? "").trim(),
      needsDob: !String(a.birthdate ?? "").trim(),
    })),
  })
}
