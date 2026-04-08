import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { filterFundraisingEntriesByQuery, getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"

export const dynamic = "force-dynamic"

/** Public search — code + label for any athlete in the RecruitNC directory (computed codes, cached ~5m). */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (raw.length < 2) {
    return NextResponse.json({ athletes: [] as { code: string; label: string }[] })
  }

  const safe = raw.slice(0, 80).replace(/[^\w\s\-'.]/g, "")
  if (safe.length < 2) {
    return NextResponse.json({ athletes: [] as { code: string; label: string }[] })
  }

  try {
    const admin = createAdminClient()
    const entries = await getFundraisingAthleteEntries(admin)
    const athletes = filterFundraisingEntriesByQuery(entries, safe, 25)
    return NextResponse.json({ athletes })
  } catch (e) {
    console.error("[spartan/fundraising-athletes]", e)
    return NextResponse.json({ athletes: [] as { code: string; label: string }[], error: "lookup_unavailable" })
  }
}
