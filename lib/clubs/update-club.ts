import type { createAdminClient } from "@/lib/supabase/admin"

/**
 * The name of the column a write failed on, or null if it failed for another reason.
 *
 * Two different errors mean the same thing here and they look nothing alike. PostgREST
 * usually rejects the request from its own schema cache before Postgres sees it
 * (PGRST204, "Could not find the 'x' column of 'y' in the schema cache"), but a stale
 * cache lets it through to Postgres instead (42703, 'column "x" ... does not exist').
 * Matching only one of them was why saving still failed.
 */
export function unknownColumnFrom(error: { code?: string; message?: string }): string | null {
  const code = error.code ?? ""
  const message = error.message ?? ""
  if (code !== "PGRST204" && code !== "42703" && !/schema cache|does not exist/i.test(message)) {
    return null
  }
  return (
    /Could not find the '([^']+)' column/i.exec(message)?.[1] ??
    /column "([^"]+)"/i.exec(message)?.[1] ??
    null
  )
}

/**
 * Update a club, dropping any column this database does not have yet.
 *
 * Postgres rejects the entire UPDATE when one column is unknown, so shipping a new field
 * ahead of its migration makes every save fail — adding instagram_url/facebook_url did
 * exactly that and blocked all club editing. Retrying without the offending column keeps
 * the rest of the edit rather than losing it, and logs a reminder that a migration is due.
 */
export async function updateClubTolerantOfMissingColumns(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ error: { message: string } | null; droppedColumns: string[] }> {
  const attempt: Record<string, unknown> = { ...patch }
  const droppedColumns: string[] = []

  for (let i = 0; i < 6; i++) {
    const { error } = await admin.from("wrestling_clubs").update(attempt).eq("id", id)
    if (!error) return { error: null, droppedColumns }

    const missing = unknownColumnFrom(error)
    if (!missing || !(missing in attempt)) return { error, droppedColumns }

    delete attempt[missing]
    droppedColumns.push(missing)
    console.warn(`[clubs] dropping unknown column "${missing}" — run the pending migration`)
  }

  return {
    error: { message: "Could not save — too many unknown columns. Run the pending migrations." },
    droppedColumns,
  }
}
