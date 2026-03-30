import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminAuth } from "@/lib/cached-auth-check"

const MIN_LEN = 2
const MAX_RESULTS = 25

/**
 * GET: Search athletes by name for manual NHSCA placement linking (admin only).
 * Query: q (required, min 2 chars), grad_year (optional — filters graduationyear)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const raw = (searchParams.get("q") ?? "").trim()
    const gradYearRaw = searchParams.get("grad_year")
    const gradYear = gradYearRaw ? parseInt(gradYearRaw, 10) : null

    if (raw.length < MIN_LEN) {
      return NextResponse.json({ athletes: [] })
    }

    const safe = raw.slice(0, 80).replace(/[^\w\s\-'.]/g, "")
    if (safe.length < MIN_LEN) {
      return NextResponse.json({ athletes: [] })
    }

    const pattern = `%${safe}%`
    const supabase = createAdminClient()

    const base = () => {
      let q = supabase
        .from("athletes")
        .select("id, name, firstName, lastName, graduationyear, highschool")
        .or(`name.ilike.${pattern},firstName.ilike.${pattern},lastName.ilike.${pattern}`)
      if (gradYear != null && !Number.isNaN(gradYear)) {
        q = q.eq("graduationyear", gradYear)
      }
      return q.order("name", { ascending: true }).limit(MAX_RESULTS)
    }

    let { data, error } = await base()

    // Some DBs only expose lowercase name parts; PostgREST errors if a column is missing.
    if (error) {
      console.warn("[nhsca search-athletes] multi-column OR failed, falling back to name only:", error.message)
      let q2 = supabase
        .from("athletes")
        .select("id, name, firstName, lastName, graduationyear, highschool")
        .ilike("name", pattern)
      if (gradYear != null && !Number.isNaN(gradYear)) {
        q2 = q2.eq("graduationyear", gradYear)
      }
      const r2 = await q2.order("name", { ascending: true }).limit(MAX_RESULTS)
      data = r2.data
      error = r2.error
    }

    if (error) {
      console.error("[nhsca search-athletes]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ athletes: data ?? [] })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error"
    console.error("[nhsca search-athletes]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
