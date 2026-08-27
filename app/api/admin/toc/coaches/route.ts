import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { applyKnownIdentities, phoneKeyFor, toCheckInList, type KnownPerson } from "@/lib/toc/coach-designation"

/** The deduped coach list, and approving or declining one. */

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error, coaches: [] }, { status: auth.status })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("toc_coach_designations")
    .select("coach_key,coach_name,coach_email,coach_phone,status,athlete_name,weight_class,relationship,submitted_club,submitted_dob,notified_at,notified_channel")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[toc coaches] load:", error.message)
    return NextResponse.json({ error: "Could not load coaches.", coaches: [] }, { status: 500 })
  }

  const rows = data ?? []

  // Resolve designations against people we already hold. A coach named by email on one form and
  // by mobile on another is one person and one lanyard; the directory is what proves it, and
  // leaving that to be spotted by eye is how two lanyards get printed for the same man.
  const emails = [...new Set(rows.map((r) => String(r.coach_email ?? "").trim().toLowerCase()).filter(Boolean))]
  const phones = [...new Set(rows.map((r) => phoneKeyFor(String(r.coach_phone ?? ""))).filter(Boolean))] as string[]

  const identities = new Map<string, KnownPerson>()
  if (emails.length > 0 || phones.length > 0) {
    const [byEmail, byPhone] = await Promise.all([
      emails.length
        ? admin.from("user_profiles").select("user_id,full_name,email,cell_phone").in("email", emails)
        : Promise.resolve({ data: [] as never[] }),
      phones.length
        ? admin.from("user_profiles").select("user_id,full_name,email,cell_phone").in("cell_phone", phones)
        : Promise.resolve({ data: [] as never[] }),
    ])

    const people = [...(byEmail.data ?? []), ...(byPhone.data ?? [])]
    for (const person of people) {
      const known: KnownPerson = {
        key: `user:${person.user_id}`,
        name: person.full_name ?? null,
        email: person.email ?? null,
        phone: person.cell_phone ?? null,
      }
      // Index the person under every key a family could have reached them by.
      const personEmail = String(person.email ?? "").trim().toLowerCase()
      if (personEmail) identities.set(personEmail, known)
      const personPhone = phoneKeyFor(String(person.cell_phone ?? ""))
      if (personPhone) identities.set(`tel:${personPhone}`, known)
    }
  }

  const coaches = toCheckInList(applyKnownIdentities(rows, identities))
  // Wrestlers who have named at least one coach — the response rate, and the number that says
  // how much chasing is left rather than how much has arrived.
  const wrestlers = new Set(rows.map((r) => r.athlete_name)).size

  return NextResponse.json({
    coaches,
    totals: {
      coaches: coaches.length,
      wrestlers,
      approved: coaches.filter((c) => c.status === "approved").length,
      pending: coaches.filter((c) => c.status === "pending").length,
      notified: coaches.filter((c) => c.notifiedAt).length,
      awaitingSend: coaches.filter((c) => c.status === "approved" && !c.notifiedAt).length,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = (await request.json().catch(() => null)) as { coachKey?: unknown; status?: unknown } | null
  const coachKey = typeof body?.coachKey === "string" ? body.coachKey.trim().toLowerCase() : ""
  const status = String(body?.status ?? "")

  if (!coachKey) return NextResponse.json({ error: "Which coach?" }, { status: 400 })
  if (!["approved", "declined", "pending"].includes(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 })
  }

  // A decision is about the person, not one of their wrestlers: the lanyard is per coach, so
  // every row for that coach moves together.
  const admin = createAdminClient()
  const { error } = await admin
    .from("toc_coach_designations")
    .update({ status, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("coach_key", coachKey)

  if (error) {
    console.error("[toc coaches] review:", error.message)
    return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, coachKey, status })
}
