import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * "Before we start, let's make sure you don't already have a profile."
 *
 * Most profiles were created by NC United because rankings needed them, and the wrestler was never
 * told. So the first step of creating one is finding the one that already exists: 292 of 421
 * profiles have no owner, and the duplicates we do have — Jacob McCord and Jake McCord, the same
 * boy twice — came from somebody typing their name into a form instead of finding themselves.
 *
 * Returns whether each match is already claimed and whether the signed-in account looks like its
 * owner, so the page can offer the right next step without exposing whose account holds it.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (q.length < 2) return NextResponse.json({ matches: [] })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("athletes")
    .select('id, name, highschool, graduationyear, weightclass, photourl, "wrestlingClub", claimed_by_user_id, "contactEmail"')
    .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
    .eq("status", "active")
    .order("name")
    .limit(8)

  if (error) {
    console.error("[profiles/find-existing]", error.message)
    return NextResponse.json({ matches: [] }, { status: 500 })
  }

  const accountEmail = (user?.email ?? "").trim().toLowerCase()

  return NextResponse.json({
    matches: (data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      highSchool: a.highschool,
      graduationYear: a.graduationyear,
      weightClass: a.weightclass,
      club: a.wrestlingClub,
      photoUrl: a.photourl,
      claimed: Boolean(a.claimed_by_user_id),
      /** True when this account already owns it — then the page links straight to the profile. */
      claimedByYou: Boolean(user?.id && a.claimed_by_user_id === user.id),
      /**
       * Whether the address on the profile matches the account asking. Drives whether claiming is
       * instant or needs a human: these are children's profiles, and the claim route currently
       * hands one to anybody signed in.
       */
      emailMatchesAccount: Boolean(
        accountEmail && String(a.contactEmail ?? "").trim().toLowerCase() === accountEmail,
      ),
    })),
  })
}
