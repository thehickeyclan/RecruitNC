import { NextResponse } from "next/server"

import { filterPayloadToSchema, getAthletesColumnNames } from "@/lib/athletes-schema"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * The one place a free profile is filled in, whether it already existed or was just created.
 *
 * Six front doors used to lead to six different forms, each with its own idea of what a profile
 * needs. This is the field set, in one place: name, school, club, class and weight are the
 * profile; everything else is optional and asked for once, plainly, with the reminder that a
 * college coach is the reader.
 *
 * Written through the schema filter, so columns the database does not have yet - Instagram, the
 * AP and Honors boxes - are dropped rather than failing the save, and start writing the moment
 * the migration runs.
 */

export const dynamic = "force-dynamic"

const REQUIRED = ["firstName", "lastName", "highschool", "graduationyear", "weightclass"] as const

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to save this profile." }, { status: 401 })

  const admin = createAdminClient()

  /* The owner, a linked parent, or an admin. Nobody else edits a wrestler's page. */
  const [{ data: athlete }, { data: link }, { data: profile }] = await Promise.all([
    admin.from("athletes").select("id, claimed_by_user_id").eq("id", id).maybeSingle(),
    admin.from("parent_athlete_links").select("user_id").eq("athlete_id", id).eq("user_id", user.id).maybeSingle(),
    admin.from("user_profiles").select("is_admin").eq("user_id", user.id).maybeSingle(),
  ])
  if (!athlete) return NextResponse.json({ error: "That profile no longer exists." }, { status: 404 })

  const owns = String((athlete as { claimed_by_user_id?: string | null }).claimed_by_user_id ?? "") === user.id
  if (!owns && !link && (profile as { is_admin?: boolean } | null)?.is_admin !== true) {
    return NextResponse.json({ error: "This is not your wrestler's profile." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "Nothing to save." }, { status: 400 })

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  const payload: Record<string, unknown> = {
    firstName: str(body.firstName),
    lastName: str(body.lastName),
    name: `${str(body.firstName)} ${str(body.lastName)}`.trim(),
    highschool: str(body.highSchool),
    wrestlingClub: str(body.club) || null,
    graduationyear: Number(body.graduationYear) || null,
    weightclass: str(body.weightClass) || null,
    academic_gpa: str(body.gpa) || null,
    academic_sat: str(body.sat) || null,
    academic_act: str(body.act) || null,
    academic_interest: str(body.academicInterest) || null,
    instagram_handle: str(body.instagram).replace(/^@/, "") || null,
    takes_ap_classes: body.apClasses === true ? true : body.apClasses === false ? false : null,
    takes_honors_classes: body.honorsClasses === true ? true : body.honorsClasses === false ? false : null,
    phone: str(body.cell) || null,
    contactEmail: str(body.email) || null,
    profile_verified: true,
    updated_at: new Date().toISOString(),
  }

  for (const field of REQUIRED) {
    const v = payload[field]
    if (v == null || v === "" || (field === "graduationyear" && !Number.isFinite(v as number))) {
      return NextResponse.json({ error: "Name, school, class and weight are needed." }, { status: 400 })
    }
  }

  const columns = await getAthletesColumnNames(admin)
  const filtered = filterPayloadToSchema(payload, columns)
  const dropped = Object.keys(payload).filter((k) => !(k in filtered))
  if (dropped.length) console.warn("[profile-setup] columns not in the schema yet:", dropped.join(", "))

  const { error } = await admin.from("athletes").update(filtered).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, saved: Object.keys(filtered).length, dropped })
}
