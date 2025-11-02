import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Note: This uses POSTGRES_URL. Ensure it points to the same Postgres your app reads from.
export async function POST() {
  try {
    const connectionString = process.env.POSTGRES_URL
    if (!connectionString) {
      return NextResponse.json({ error: "POSTGRES_URL is not configured" }, { status: 500 })
    }

    const sql = neon(connectionString)

    // Create table and index
    await sql`
      CREATE TABLE IF NOT EXISTS college_divisions (
        id SERIAL PRIMARY KEY,
        college_name TEXT NOT NULL UNIQUE,
        division TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_college_divisions_college_name
      ON college_divisions (college_name);
    `

    // Seed initial data (idempotent)
    await sql`
      INSERT INTO college_divisions (college_name, division)
      VALUES
        ('UNC Chapel Hill', 'Division I'),
        ('NC State', 'Division I'),
        ('Duke', 'Division I'),
        ('UNC Pembroke', 'Division II'),
        ('Mount Olive', 'Division II'),
        ('Belmont Abbey', 'Division II'),
        ('Greensboro College', 'Division III'),
        ('Guilford College', 'Division III'),
        ('Montreat College', 'NAIA'),
        ('St. Andrews University', 'NAIA'),
        ('Wake Tech', 'NJCAA'),
        ('Louisburg College', 'NJCAA')
      ON CONFLICT (college_name) DO NOTHING;
    `

    return NextResponse.json({
      success: true,
      message: "college_divisions table ensured and seeded",
    })
  } catch (error) {
    console.error("Error creating college_divisions table:", error)
    const message = error instanceof Error ? error.message : "Unknown error during table creation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
