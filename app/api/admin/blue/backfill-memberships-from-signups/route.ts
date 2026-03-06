import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { athleteEnrichmentFromSignup } from "@/lib/blue-signup-enrich-athlete"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** POST: One-time backfill. For each blue_signups where status=paid, ensure a blue_memberships row exists (so reports show correct MRR/active count). */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const { data: paidSignups, error: signupErr } = await admin
    .from("blue_signups")
    .select("id, parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, athlete_wrestling_club, highest_achievement, tshirt_size, stripe_customer_id")
    .eq("status", "paid")
    .order("created_at", { ascending: true })

  if (signupErr) {
    return NextResponse.json({ error: signupErr.message, created: 0, skipped: 0 }, { status: 500 })
  }
  if (!paidSignups?.length) {
    return NextResponse.json({ message: "No paid signups to backfill.", created: 0, skipped: 0 })
  }

  let created = 0
  let skipped = 0

  for (const signup of paidSignups as Array<{
    id: string
    parent_email: string
    parent_first_name: string
    parent_last_name: string
    athlete_first_name: string
    athlete_last_name: string
    athlete_graduation_year: number
    athlete_high_school: string
    athlete_weight_class?: string
    athlete_cell_phone?: string | null
    athlete_email?: string | null
    athlete_gpa?: string | null
    athlete_wrestling_club?: string | null
    highest_achievement?: string | null
    tshirt_size?: string
    stripe_customer_id?: string | null
  }>) {
    const parentEmail = (signup.parent_email || "").trim().toLowerCase()
    const gradYear = Number(signup.athlete_graduation_year)
    const athleteName = [signup.athlete_first_name, signup.athlete_last_name].filter(Boolean).join(" ").trim()
    const highSchool = (signup.athlete_high_school || "").trim()

    if (!parentEmail || !athleteName || !Number.isFinite(gradYear) || gradYear < 2020 || gradYear > 2040) {
      skipped++
      continue
    }

    let payerUserId: string | null = null
    const { data: profileRow } = await admin
      .from("user_profiles")
      .select("user_id")
      .ilike("email", parentEmail)
      .limit(1)
      .maybeSingle()
    if (profileRow?.user_id) {
      payerUserId = profileRow.user_id as string
    } else {
      const randomPassword = "blue-backfill-" + crypto.randomUUID().slice(0, 8)
      const { data: newUser, error: createUserErr } = await admin.auth.admin.createUser({
        email: parentEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: [signup.parent_first_name, signup.parent_last_name].filter(Boolean).join(" ").trim(),
          first_name: (signup.parent_first_name || "").trim(),
          last_name: (signup.parent_last_name || "").trim(),
          profile_type: "parent",
        },
      })
      if (!createUserErr && newUser?.user?.id) {
        payerUserId = newUser.user.id
        await admin.from("user_profiles").insert({
          user_id: newUser.user.id,
          email: newUser.user.email,
          full_name: newUser.user.user_metadata?.full_name ?? parentEmail,
          first_name: newUser.user.user_metadata?.first_name ?? null,
          last_name: newUser.user.user_metadata?.last_name ?? null,
          profile_type: "parent",
          role: "user",
          is_admin: false,
        })
      }
    }

    if (!payerUserId) {
      skipped++
      continue
    }

    const enrichment = athleteEnrichmentFromSignup(signup)
    const existingAthlete = await findExistingAthlete(admin, {
      name: athleteName,
      graduationYear: gradYear,
      school: highSchool,
    })
    let athleteId: string | undefined = existingAthlete?.id
    if (!athleteId) {
      const columns = await getAthletesColumnNames(admin)
      const athletePayload = filterPayloadToSchema({
        name: athleteName,
        firstName: (signup.athlete_first_name || "").trim(),
        lastName: (signup.athlete_last_name || "").trim(),
        graduationyear: gradYear,
        highschool: highSchool,
        weightclass: (signup.athlete_weight_class || "").trim() || null,
        ncUnitedTeam: "blue",
        recruiting_status: "Uncommitted",
        is_prospect: true,
        profile_verified: false,
        updated_at: new Date().toISOString(),
        ...enrichment,
      }, columns)
      const { data: newAthlete, error: athleteErr } = await admin
        .from("athletes")
        .insert(athletePayload)
        .select("id")
        .single()
      if (athleteErr || !newAthlete?.id) {
        skipped++
        continue
      }
      athleteId = newAthlete.id
    } else {
      const columns = await getAthletesColumnNames(admin)
      const updatePayload = filterPayloadToSchema({ ...enrichment, ncUnitedTeam: "blue", updated_at: new Date().toISOString() }, columns)
      if (Object.keys(updatePayload).length > 1) {
        await admin.from("athletes").update(updatePayload).eq("id", athleteId)
      }
    }

    const { data: existingMembership } = await admin
      .from("blue_memberships")
      .select("id")
      .eq("payer_user_id", payerUserId)
      .eq("athlete_id", athleteId)
      .maybeSingle()
    if (existingMembership) {
      skipped++
      continue
    }

    const startedAt = new Date().toISOString()
    const { error: membershipErr } = await admin.from("blue_memberships").insert({
      athlete_id: athleteId,
      payer_user_id: payerUserId,
      status: "active",
      started_at: startedAt,
      stripe_customer_id: signup.stripe_customer_id || null,
      stripe_subscription_id: null,
      source: "invite",
      created_at: startedAt,
      updated_at: startedAt,
      ...(signup.tshirt_size && { tshirt_size: signup.tshirt_size }),
    })
    if (!membershipErr) created++
    else skipped++
  }

  return NextResponse.json({
    message: `Backfill complete. Created ${created} membership(s), skipped ${skipped}.`,
    created,
    skipped,
  })
}
