import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { checkMigrations } from "@/lib/db/pending-migrations"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Which schema changes are still waiting to be pasted into Supabase, and the SQL for each,
 * so the answer and the fix are in the same place. The SQL is read from docs/sql at request
 * time rather than bundled, so it can never drift from what is in the repo.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const migrations = await checkMigrations(async (table, columns) => {
    const { data, error } = await admin.from(table).select(columns).limit(0)
    return { data, error }
  })

  const withSql = await Promise.all(
    migrations.map(async (migration) => {
      let sql: string | null = null
      try {
        // Basename only — the file name comes from our own register, but joining an
        // unsanitised name into a path is how directory traversal starts.
        const file = path.basename(migration.file)
        sql = await fs.readFile(path.join(process.cwd(), "docs", "sql", file), "utf8")
      } catch {
        sql = null
      }
      return { ...migration, sql, sqlPath: `docs/sql/${migration.file}` }
    }),
  )

  return NextResponse.json({
    migrations: withSql,
    summary: {
      pending: withSql.filter((m) => m.state === "pending").length,
      applied: withSql.filter((m) => m.state === "applied").length,
      unknown: withSql.filter((m) => m.state === "unknown").length,
    },
  })
}
