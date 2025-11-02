import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST() {
  try {
    const connectionString =
      process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING

    if (!connectionString) {
      return NextResponse.json({ error: "Database URL not configured" }, { status: 500 })
    }

    const sql = neon(connectionString)

    // 1) Add columns if they don't exist (idempotent DDL)
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS commitment_approved BOOLEAN DEFAULT FALSE`
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS commitment_approved_at TIMESTAMPTZ`
    await sql`ALTER TABLE athletes ADD COLUMN IF NOT EXISTS commitment_approved_by UUID`

    // 2) Add FK constraint only if auth.users exists, and if constraint not already present
    //    Guarded to avoid errors on databases without the 'auth' schema.
    await sql`
      DO $$
      BEGIN
        IF to_regclass('auth.users') IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'athletes_commitment_approved_by_fkey'
          ) THEN
            ALTER TABLE athletes
              ADD CONSTRAINT athletes_commitment_approved_by_fkey
              FOREIGN KEY (commitment_approved_by)
              REFERENCES auth.users(id);
          END IF;
        END IF;
      END $$;
    `

    // 3) Create indexes (idempotent)
    await sql`CREATE INDEX IF NOT EXISTS idx_athletes_commitment_approved ON athletes(commitment_approved)`
    await sql`CREATE INDEX IF NOT EXISTS idx_athletes_commitment_approved_at ON athletes(commitment_approved_at)`

    // 4) Migrate existing claimed profiles to approved status (idempotent)
    await sql`
      UPDATE athletes
      SET
        commitment_approved = TRUE,
        commitment_approved_at = COALESCE(updated_at, created_at, NOW()),
        commitment_approved_by = COALESCE(commitment_approved_by, claimed_by_user_id)
      WHERE claimed_by_user_id IS NOT NULL
        AND (commitment_approved IS NULL OR commitment_approved = FALSE)
    `

    return NextResponse.json({
      success: true,
      message: "Commitment approval columns added successfully",
    })
  } catch (error) {
    console.error("Error in script execution:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
