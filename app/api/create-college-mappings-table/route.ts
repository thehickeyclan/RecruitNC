import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Create the table directly
    const { error: createError } = await supabase.rpc("execute_sql", {
      sql_query: `
        CREATE TABLE IF NOT EXISTS college_division_mappings (
          id SERIAL PRIMARY KEY,
          college_name TEXT NOT NULL UNIQUE,
          division TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_college_division_mappings_college_name 
        ON college_division_mappings(college_name);
      `,
    })

    if (createError) {
      return NextResponse.json({ error: `Failed to create table: ${createError.message}` }, { status: 500 })
    }

    // Seed with some initial data
    const initialColleges = [
      { college_name: "UNC Chapel Hill", division: "Division I" },
      { college_name: "NC State", division: "Division I" },
      { college_name: "Duke", division: "Division I" },
      { college_name: "UNC Pembroke", division: "Division II" },
      { college_name: "Mount Olive", division: "Division II" },
      { college_name: "Belmont Abbey", division: "Division II" },
      { college_name: "Greensboro College", division: "Division III" },
      { college_name: "Guilford College", division: "Division III" },
      { college_name: "Montreat College", division: "NAIA" },
      { college_name: "St. Andrews University", division: "NAIA" },
      { college_name: "Wake Tech", division: "NJCAA" },
      { college_name: "Louisburg College", division: "NJCAA" },
    ]

    for (const college of initialColleges) {
      const { error: insertError } = await supabase
        .from("college_division_mappings")
        .upsert(college, { onConflict: "college_name" })

      if (insertError) {
        console.error(`Error seeding ${college.college_name}:`, insertError)
      }
    }

    return NextResponse.json({ success: true, message: "College division mappings table created and seeded" })
  } catch (error) {
    console.error("Error creating college mappings table:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
