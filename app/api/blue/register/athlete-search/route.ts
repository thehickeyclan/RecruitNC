import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { athleteFromRow, missingAthleteFields } from "@/lib/blue-register-resolve"

/**
 * Find the wrestler being registered, so the family says which one rather than a matcher guessing.
 *
 * Registration resolved the athlete behind the scenes, by fuzzy name plus graduation year plus
 * school - the same test that put three West Forsyth brothers' bouts on one record and left two
 * Ashton Tennessees in the table. When it guesses wrong nobody finds out until a parent asks why
 * his son carries someone else's losses.
 *
 * The picker on the page only ever offered athletes already linked to the account, so a family
 * with none - most of them, with 376 of 512 profiles unclaimed - got a blank form and made a
 * second profile for a wrestler who already had one.
 *
 * Results come back in the same shape as a linked athlete, missing fields and all, so the page
 * treats a searched wrestler exactly like a picked one.
 *
 * Signed in only: these are minors, and the page already requires an account.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 })

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (q.length < 2) return NextResponse.json({ results: [] })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("athletes")
    .select("*")
    .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
    .order("graduationyear", { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = (data ?? []).map((row) => {
    const fields = athleteFromRow(row as never)
    const claimedBy = String((row as { claimed_by_user_id?: string | null }).claimed_by_user_id ?? "")
    return {
      id: String((row as { id: string }).id),
      name: String((row as { name?: string }).name ?? ""),
      ...fields,
      missingFields: missingAthleteFields(fields),
      alreadyInBlue: String((row as { ncUnitedTeam?: string | null }).ncUnitedTeam ?? "") === "blue",
      /* Claimed by someone else is not a reason to hide him, but the page should say so. */
      claimed: Boolean(claimedBy),
      claimedByMe: claimedBy === user.id,
    }
  })

  return NextResponse.json({ results })
}
