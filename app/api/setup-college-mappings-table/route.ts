import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("Setting up college mappings table...")

    // First check if table exists by trying a simple query
    const { data: existingData, error: checkError } = await supabase
      .from("college_division_mappings")
      .select("count", { count: "exact", head: true })

    if (checkError) {
      if (checkError.message.includes("relation") && checkError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "Table does not exist. Please create the college_division_mappings table in your Supabase dashboard first.",
            sql: `
CREATE TABLE college_division_mappings (
  id SERIAL PRIMARY KEY,
  college_name TEXT NOT NULL UNIQUE,
  division TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_college_division_mappings_college_name 
ON college_division_mappings(college_name);

-- Insert some initial data (spell out NCAA; Roman numerals I, II, III)
INSERT INTO college_division_mappings (college_name, division) VALUES
('UNC Chapel Hill', 'NCAA Division I'),
('NC State', 'NCAA Division I'),
('Duke', 'NCAA Division I'),
('UNC Pembroke', 'NCAA Division II'),
('Mount Olive', 'NCAA Division II'),
('Belmont Abbey', 'NCAA Division II'),
('Greensboro College', 'NCAA Division III'),
('Guilford College', 'NCAA Division III'),
('Montreat College', 'NAIA'),
('Wake Tech', 'NJCAA');
            `,
          },
          { status: 400 },
        )
      } else {
        throw checkError
      }
    }

    // If we get here, table exists. Check if it has data
    const { count } = existingData as any

    if (count === 0) {
      console.log("Table exists but is empty, seeding with initial data...")

      const initialColleges = [
        { college_name: "UNC Chapel Hill", division: "NCAA Division I" },
        { college_name: "NC State", division: "NCAA Division I" },
        { college_name: "Duke", division: "NCAA Division I" },
        { college_name: "UNC Pembroke", division: "NCAA Division II" },
        { college_name: "Mount Olive", division: "NCAA Division II" },
        { college_name: "Belmont Abbey", division: "NCAA Division II" },
        { college_name: "Greensboro College", division: "NCAA Division III" },
        { college_name: "Guilford College", division: "NCAA Division III" },
        { college_name: "Montreat College", division: "NAIA" },
        { college_name: "Wake Tech", division: "NJCAA" },
      ]

      // Insert initial data
      const { error: insertError } = await supabase.from("college_division_mappings").insert(initialColleges)

      if (insertError) {
        console.error("Error seeding data:", insertError)
        throw insertError
      }

      return NextResponse.json({
        success: true,
        message: "College division mappings table seeded successfully",
        seeded: initialColleges.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: "College division mappings table already exists and has data",
      count: count,
    })
  } catch (error) {
    console.error("Error setting up college mappings table:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
