import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { maskEmail, maskPhone } from "@/lib/toc/coach-designation"

/**
 * Name search for coaches we already hold, so a family can pick their coach instead of typing
 * details we have.
 *
 * Returns a masked hint and nothing else. The form sends back the id, and the server resolves
 * the real address and number — a public endpoint that answered "what is this person's email"
 * would be a harvesting tool wearing a helpful hat.
 */

export const dynamic = "force-dynamic"

/** Long enough that the directory cannot be walked a letter at a time. */
const MIN_QUERY = 3
const LIMIT = 5

export async function GET(request: NextRequest) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (query.length < MIN_QUERY) return NextResponse.json({ people: [] })

  const safe = query.replace(/[%_]/g, "")
  if (!safe) return NextResponse.json({ people: [] })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("user_profiles")
    .select("user_id, full_name, email, cell_phone")
    .ilike("full_name", `%${safe}%`)
    .order("full_name")
    .limit(LIMIT)

  if (error) {
    console.error("[toc coach-lookup]", error.message)
    return NextResponse.json({ people: [] }, { status: 500 })
  }

  return NextResponse.json({
    people: (data ?? [])
      // Somebody we cannot contact is no use as a suggestion.
      .filter((p) => p.email || p.cell_phone)
      .map((p) => ({
        id: p.user_id,
        name: p.full_name ?? "",
        emailHint: maskEmail(p.email),
        phoneHint: maskPhone(p.cell_phone),
      })),
  })
}
