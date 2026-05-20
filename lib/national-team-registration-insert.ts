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
  singlet_size?: string | null
  shorts_size?: string | null
  shirt_size?: string | null
}

type PgErr = { code?: string; message?: string; details?: string; hint?: string }

export function describeRegistrationInsertError(err: PgErr | null): string {
  if (!err) return "Failed to save registration. Please try again."
  const code = err.code ?? ""
  const msg = (err.message ?? "").toLowerCase()

  if (code === "42P01" || (msg.includes("does not exist") && msg.includes("national_team"))) {
    return "Registrations are not set up yet. Contact NC United (database setup required)."
  }
  if (code === "42703" || (msg.includes("column") && msg.includes("does not exist"))) {
    if (msg.includes("singlet") || msg.includes("shirt") || msg.includes("shorts")) {
      return "Gear size columns are missing in the database. Contact NC United to run the shirt-size migration."
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

/**
 * Insert pending registration for hub/register checkout.
 * Core row first (required columns only), then optional patch so missing gear-size columns do not block payment.
 */
export async function insertPendingNationalTeamRegistration(
  admin: SupabaseClient,
  input: PendingNationalTeamRegistrationInput
): Promise<{ id: string } | { error: string; pgError?: PgErr }> {
  const core: Record<string, unknown> = {
    event_slug: input.event_slug,
    athlete_first_name: input.athlete_first_name,
    athlete_last_name: input.athlete_last_name,
    athlete_email: input.athlete_email,
    parent_email: input.parent_email,
    high_school: input.high_school,
    graduation_year: input.graduation_year,
    primary_weight: input.primary_weight,
    reg_fee_cents: input.reg_fee_cents,
    apparel_fee_cents: input.apparel_fee_cents,
    status: "pending",
  }

  const tryInsert = async (payload: Record<string, unknown>) => {
    return admin.from("national_team_event_registrations").insert(payload).select("id").single()
  }

  // Prefer including parent_name when the column exists
  let result = await tryInsert({ ...core, parent_name: input.parent_name })
  let err = result.error as PgErr | null

  if (err && (err.message?.includes("parent_name") || err.code === "42703")) {
    result = await tryInsert(core)
    err = result.error as PgErr | null
  }

  if (err || !result.data?.id) {
    console.error("[national-team] registration insert:", err ?? "no row")
    return { error: describeRegistrationInsertError(err), pgError: err ?? undefined }
  }

  const regId = result.data.id as string

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.parent_user_id) patch.parent_user_id = input.parent_user_id
  if (input.singlet_size) patch.singlet_size = input.singlet_size
  if (input.shorts_size) patch.shorts_size = input.shorts_size
  if (input.shirt_size) patch.shirt_size = input.shirt_size

  if (input.parent_user_id || input.singlet_size || input.shorts_size || input.shirt_size) {
    const { error: patchErr } = await admin
      .from("national_team_event_registrations")
      .update(patch)
      .eq("id", regId)

    if (patchErr) {
      console.warn("[national-team] registration patch (non-fatal):", patchErr)
      // Retry without parent_user_id if FK failed
      if ((patchErr as PgErr).code === "23503" && input.parent_user_id) {
        const { parent_user_id: _, ...withoutUser } = patch
        await admin.from("national_team_event_registrations").update(withoutUser).eq("id", regId)
      }
    }
  }

  return { id: regId }
}
