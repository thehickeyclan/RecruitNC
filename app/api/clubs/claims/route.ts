import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

function asText(value: unknown): string | null {
  const text = String(value ?? "").trim()
  return text ? text : null
}

/** The signed-in user's own claims, so the button can show its real state. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ claims: [] })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("club_claims")
    .select("club_id,status")
    .eq("user_id", user.id)

  // The table may not exist yet; an unclaimed state is the right answer either way.
  if (error) return NextResponse.json({ claims: [] })

  return NextResponse.json({
    claims: (data ?? []).map((row) => ({
      clubId: String((row as { club_id?: unknown }).club_id),
      status: String((row as { status?: unknown }).status ?? "pending"),
    })),
  })
}

/**
 * Request control of a club listing.
 *
 * This only ever writes a pending row. Nothing here grants edit rights — an admin has to
 * approve the claim by hand, because automatic claiming of a youth sports listing is how
 * a listing gets hijacked.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to claim a club." }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const clubId = asText(body.clubId)
  const claimedRole = asText(body.claimedRole)
  const evidence = asText(body.evidence)

  if (!clubId) return NextResponse.json({ error: "Missing club." }, { status: 400 })
  if (!claimedRole) return NextResponse.json({ error: "Tell us your role at the club." }, { status: 400 })
  if (!evidence || evidence.length < 10) {
    return NextResponse.json(
      { error: "Add something we can check — a club email, a page that lists you, or a phone number." },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: club } = await admin.from("wrestling_clubs").select("id,name").eq("id", clubId).maybeSingle()
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 })

  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .maybeSingle()

  const profileRow = (profile ?? {}) as Record<string, unknown>
  const userName =
    [profileRow.full_name, profileRow.name, [profileRow.first_name, profileRow.last_name].filter(Boolean).join(" ")]
      .map((v) => String(v ?? "").trim())
      .find(Boolean) ?? (user.email ?? "RecruitNC user")

  // Re-requesting updates the existing row rather than stacking duplicates in the queue.
  const { error } = await admin.from("club_claims").upsert(
    {
      club_id: clubId,
      user_id: user.id,
      user_email: user.email ?? null,
      user_name: userName,
      claimed_role: claimedRole,
      evidence,
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id,user_id" },
  )

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Club claims are not enabled yet. Run docs/sql/club-claims.sql.txt in Supabase." },
        { status: 503 },
      )
    }
    console.error("[clubs/claims]", error)
    return NextResponse.json({ error: "Could not send that request. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
