import type { SupabaseClient } from "@supabase/supabase-js"

export type PendingNationalTeamRegistrationInput = {
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string
  parent_name: string
  parent_user_id?: string | null
  high_school: string
  graduation_year: string
  primary_weight: string
  reg_fee_cents: number
  apparel_fee_cents: number
  athlete_phone?: string | null
  club_team?: string | null
  secondary_weight?: string | null
  athlete_dob?: string | null
  singlet_size?: string | null
  shorts_size?: string | null
  shirt_size?: string | null
}

type PgErr = { code?: string; message?: string; details?: string; hint?: string }

export function describeRegistrationInsertError(err: PgErr | null): string {
  if (!err) return "Failed to save registration. Please try again."
  const code = err.code ?? ""
  const msg = (err.message ?? "").toLowerCase()

  if (code === "42P01") {
    return "Registrations are not set up yet. Contact NC United (database setup required)."
  }
  if (code === "42703" || (msg.includes("column") && msg.includes("does not exist"))) {
    if (msg.includes("singlet") || msg.includes("shirt") || msg.includes("shorts")) {
      return "Gear size columns are missing in the database. Contact NC United to run the shirt-size migration."
    }
    if (msg.includes("athlete_dob")) {
      return "Athlete date of birth is not set up in the database yet. Contact NC United."
    }
    if (msg.includes("parent_name")) {
      return "Registration form is out of sync with the database (parent_name). Contact NC United."
    }
    return "Database schema is missing a required column. Contact NC United."
  }
  if (code === "23503") {
    return "Could not link this order to your login. Try signing out and back in, then retry."
  }
  if (code === "23505") {
    return "A pending registration already exists for this athlete. Finish checkout from your email or contact NC United."
  }
  return "Failed to save registration. Please try again or contact NC United."
}

async function tryInsert(admin: SupabaseClient, payload: Record<string, unknown>) {
  return admin.from("national_team_event_registrations").insert(payload).select("id").single()
}

/** Drop keys whose column name appears in a 42703 missing-column error, then retry patch. */
async function patchRegistrationOptionalFields(
  admin: SupabaseClient,
  regId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  let pending = { ...fields, updated_at: new Date().toISOString() }
  for (let attempt = 0; attempt < 6 && Object.keys(pending).length > 1; attempt++) {
    const { error } = await admin.from("national_team_event_registrations").update(pending).eq("id", regId)
    if (!error) return
    const pg = error as PgErr
    if (pg.code !== "42703") {
      if (pg.code === "23503" && pending.parent_user_id) {
        const { parent_user_id: _, ...withoutUser } = pending
        pending = withoutUser
        continue
      }
      console.warn("[national-team] registration patch (non-fatal):", error)
      return
    }
    const msg = (pg.message ?? "").toLowerCase()
    const dropKey = Object.keys(pending).find((k) => k !== "updated_at" && msg.includes(k))
    if (!dropKey) {
      console.warn("[national-team] registration patch unknown column:", error)
      return
    }
    const { [dropKey]: _removed, ...rest } = pending
    pending = rest
  }
}

/**
 * Insert pending registration for hub/register checkout.
 * Core row first (required columns only), then optional patch so missing gear-size / DOB columns do not block payment.
 */
export async function insertPendingNationalTeamRegistration(
  admin: SupabaseClient,
  input: PendingNationalTeamRegistrationInput,
): Promise<{ id: string } | { error: string; pgError?: PgErr }> {
  const core: Record<string, unknown> = {
    event_slug: input.event_slug,
    athlete_first_name: input.athlete_first_name,
    athlete_last_name: input.athlete_last_name,
    athlete_email: input.athlete_email,
    parent_email: input.parent_email,
    high_school: input.high_school || "—",
    graduation_year: input.graduation_year || "—",
    primary_weight: input.primary_weight || "—",
    reg_fee_cents: input.reg_fee_cents,
    apparel_fee_cents: input.apparel_fee_cents,
    status: "pending",
  }

  const withParent = { ...core, parent_name: input.parent_name }
  const withContact = {
    ...withParent,
    ...(input.athlete_phone ? { athlete_phone: input.athlete_phone } : {}),
    ...(input.club_team ? { club_team: input.club_team } : {}),
    ...(input.secondary_weight ? { secondary_weight: input.secondary_weight } : {}),
  }

  let result = await tryInsert(admin, withContact)
  let err = result.error as PgErr | null
  if (err) {
    result = await tryInsert(admin, withParent)
    err = result.error as PgErr | null
  }
  if (err) {
    result = await tryInsert(admin, core)
    err = result.error as PgErr | null
  }

  if (err || !result.data?.id) {
    console.error("[national-team] registration insert:", err ?? "no row")
    return { error: describeRegistrationInsertError(err), pgError: err ?? undefined }
  }

  const regId = result.data.id as string

  const optionalPatch: Record<string, unknown> = {}
  if (input.parent_user_id) optionalPatch.parent_user_id = input.parent_user_id
  if (input.singlet_size) optionalPatch.singlet_size = input.singlet_size
  if (input.shorts_size) optionalPatch.shorts_size = input.shorts_size
  if (input.shirt_size) optionalPatch.shirt_size = input.shirt_size
  if (input.athlete_dob) optionalPatch.athlete_dob = input.athlete_dob
  if (input.athlete_phone && !withContact.athlete_phone) optionalPatch.athlete_phone = input.athlete_phone
  if (input.club_team && !withContact.club_team) optionalPatch.club_team = input.club_team
  if (input.secondary_weight && !withContact.secondary_weight) optionalPatch.secondary_weight = input.secondary_weight
  if (input.parent_name && !withParent.parent_name) optionalPatch.parent_name = input.parent_name

  if (Object.keys(optionalPatch).length > 0) {
    await patchRegistrationOptionalFields(admin, regId, optionalPatch)
  }

  return { id: regId }
}
