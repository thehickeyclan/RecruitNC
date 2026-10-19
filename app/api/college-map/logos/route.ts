import { NextResponse } from "next/server"

import { allSchoolLogos } from "@/lib/college-programs/logo-batch"

export const dynamic = "force-dynamic"

/** Every map school's logo, { schoolId: url }, for the list under the college map. Public logos only. */
export async function GET() {
  const logos = await allSchoolLogos().catch(() => ({}))
  return NextResponse.json({ logos }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } })
}
