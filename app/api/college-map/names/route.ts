import { NextResponse } from "next/server"

import { loadCollegePickerOptions } from "@/lib/college-programs/load"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * The college list for the coach sign-up form: names, places and divisions only, all public.
 * The same schools as the college map (Matt, 12 October 2026: "the map is pulling in a list,
 * use that list").
 */
export async function GET() {
  try {
    const colleges = await loadCollegePickerOptions(createAdminClient())
    return NextResponse.json({ colleges }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } })
  } catch (error) {
    console.error("[college-map/names]", error)
    return NextResponse.json({ colleges: [] }, { status: 500 })
  }
}
