/**
 * The register of SQL that has to be run by hand in Supabase.
 *
 * There is no migration runner on this project — schema changes ship as files in docs/sql
 * that someone pastes into the SQL editor. That works right up until one gets missed, and
 * then the code half-works in a way nobody can see: the map empties, a save fails silently,
 * a column reads as undefined. The only signal was a build that looked fine.
 *
 * Every schema change gets an entry here. The check probes the live database, so the answer
 * is what is actually there, not what anyone remembers running.
 *
 * Adding one: name the table and the columns the code needs. That is the whole contract.
 */

export type MigrationCheck = {
  /** File under docs/sql, and the id used in the URL. */
  file: string
  title: string
  /** What breaks while this is unrun — written for whoever is reading the page at 11pm. */
  breaksWithout: string
  table: string
  /** Columns the code expects. A missing table is reported as missing regardless. */
  columns: string[]
}

export const MIGRATION_CHECKS: MigrationCheck[] = [
  {
    file: "club-status.sql.txt",
    title: "Club status (open / closed / merged)",
    breaksWithout: "Clubs that have shut down stay on the map, so parents are sent to gyms that no longer exist.",
    table: "wrestling_clubs",
    columns: ["status", "merged_into_club_id", "closed_note"],
  },
  {
    file: "wrestling-club-map.sql.txt",
    title: "Club map — canonical clubs, aliases and coordinates",
    breaksWithout: "The /clubs map has no clubs to show at all.",
    table: "wrestling_clubs",
    columns: ["latitude", "longitude", "normalized_name", "verified", "instagram_url", "facebook_url"],
  },
  {
    file: "club-claims.sql.txt",
    title: "Club claims — coaches requesting control of their club",
    breaksWithout: "The claim button on a club page fails when someone submits it.",
    table: "club_claims",
    columns: ["club_id", "status", "requester_email"],
  },
  {
    file: "athlete-club-fk.sql.txt",
    title: "Athlete → club link",
    breaksWithout: "Athletes match their club by loose text, so a rename or typo silently drops them from it.",
    table: "athletes",
    columns: ["club_id"],
  },
  {
    file: "orders-order-type.sql.txt",
    title: "Order type — separates registrations from merchandise",
    breaksWithout: "Tournament registrations sit in the fulfilment queue as if they were something to ship.",
    table: "orders",
    columns: ["order_type"],
  },
]

export type MigrationStatus = MigrationCheck & {
  state: "applied" | "pending" | "unknown"
  missingColumns: string[]
  detail: string | null
}

type Probe = { data: unknown; error: { code?: string; message?: string } | null }

/**
 * Ask the database directly rather than tracking what was run. Selecting a column that does
 * not exist is an error (42703); a missing table is 42P01. `limit(0)` means no rows come
 * back — this is a schema question, not a data one.
 */
export async function checkMigrations(
  probe: (table: string, columns: string) => Promise<Probe>,
): Promise<MigrationStatus[]> {
  const results: MigrationStatus[] = []

  for (const check of MIGRATION_CHECKS) {
    const tableProbe = await probe(check.table, "*")
    if (tableProbe.error?.code === "42P01") {
      results.push({
        ...check,
        state: "pending",
        missingColumns: check.columns,
        detail: `Table "${check.table}" does not exist yet.`,
      })
      continue
    }
    if (tableProbe.error) {
      results.push({ ...check, state: "unknown", missingColumns: [], detail: tableProbe.error.message ?? null })
      continue
    }

    // One column at a time, so the answer is *which* is missing rather than just "something".
    const missing: string[] = []
    for (const column of check.columns) {
      const columnProbe = await probe(check.table, column)
      if (columnProbe.error?.code === "42703" || columnProbe.error?.code === "PGRST204") missing.push(column)
    }

    results.push({
      ...check,
      state: missing.length ? "pending" : "applied",
      missingColumns: missing,
      detail: missing.length ? `Missing ${missing.length === 1 ? "column" : "columns"}: ${missing.join(", ")}.` : null,
    })
  }

  return results
}
