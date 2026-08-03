import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

/** Every claim, newest first, with the club it is for. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("club_claims")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        claims: [],
        setupNeeded: true,
        error: "Club claims are not enabled yet. Run docs/sql/club-claims.sql.txt in Supabase.",
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const clubIds = Array.from(new Set((data ?? []).map((row) => (row as { club_id?: unknown }).club_id)))
  const { data: clubs } = clubIds.length
    ? await admin.from("wrestling_clubs").select("id,name,city").in("id", clubIds)
    : { data: [] as Array<Record<string, unknown>> }

  const clubById = new Map(
    (clubs ?? []).map((club) => [String((club as Record<string, unknown>).id), club as Record<string, unknown>]),
  )

  return NextResponse.json({
    claims: (data ?? []).map((row) => {
      const claim = row as Record<string, unknown>
      const club = clubById.get(String(claim.club_id))
      return {
        id: String(claim.id),
        clubId: String(claim.club_id),
        clubName: String(club?.name ?? "Unknown club"),
        clubCity: (club?.city as string | null) ?? null,
        userName: (claim.user_name as string | null) ?? null,
        userEmail: (claim.user_email as string | null) ?? null,
        claimedRole: (claim.claimed_role as string | null) ?? null,
        evidence: (claim.evidence as string | null) ?? null,
        status: String(claim.status ?? "pending"),
        adminNotes: (claim.admin_notes as string | null) ?? null,
        createdAt: claim.created_at as string | null,
      }
    }),
  })
}

/** Approve, reject, or revoke a claim. This is the only thing that grants edit rights. */
export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const id = String(body.id ?? "").trim()
  const status = String(body.status ?? "").trim()
  if (!id) return NextResponse.json({ error: "Missing claim id." }, { status: 400 })
  if (!["approved", "rejected", "revoked", "pending"].includes(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { error } = await admin
    .from("club_claims")
    .update({
      status,
      admin_notes: String(body.adminNotes ?? "").trim() || null,
      reviewed_by_user_id: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
