import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("Setting up college mappings table...")

    // First check if table exists and get row count (count comes from response, not data, when head: true)
    const { count, error: checkError } = await supabase
      .from("college_division_mappings")
      .select("college_name", { count: "exact", head: true })

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

    // Canonical list: correct divisions so Roanoke = D-III, plus add Lander, Presbyterian, Mount Union, Gardner-Webb, Appalachian State
    const canonicalColleges = [
      { college_name: "UNC Chapel Hill", division: "NCAA Division I" },
      { college_name: "NC State", division: "NCAA Division I" },
      { college_name: "Duke", division: "NCAA Division I" },
      { college_name: "Appalachian State", division: "NCAA Division I" },
      { college_name: "Gardner-Webb", division: "NCAA Division I" },
      { college_name: "Presbyterian", division: "NCAA Division I" },
      { college_name: "UNC Pembroke", division: "NCAA Division II" },
      { college_name: "Mount Olive", division: "NCAA Division II" },
      { college_name: "University of Mount Olive", division: "NCAA Division II" },
      { college_name: "Belmont Abbey", division: "NCAA Division II" },
      { college_name: "Lander", division: "NCAA Division II" },
      { college_name: "Greensboro College", division: "NCAA Division III" },
      { college_name: "Guilford College", division: "NCAA Division III" },
      { college_name: "Roanoke College", division: "NCAA Division III" },
      { college_name: "Roanoke", division: "NCAA Division III" },
      { college_name: "Mount Union", division: "NCAA Division III" },
      { college_name: "Montreat College", division: "NAIA" },
      { college_name: "Wake Tech", division: "NJCAA" },
    ]

    const rowCount = count ?? 0
    if (rowCount === 0) {
      console.log("Table exists but is empty, seeding with initial data...")
      const { error: insertError } = await supabase.from("college_division_mappings").insert(canonicalColleges)
      if (insertError) {
        console.error("Error seeding data:", insertError)
        throw insertError
      }
      return NextResponse.json({
        success: true,
        message: "College division mappings table seeded successfully",
        seeded: canonicalColleges.length,
      })
    }

    // Table has data: upsert canonical list to fix wrong divisions (e.g. Roanoke → D-III) and add missing schools
    const { error: upsertError } = await supabase
      .from("college_division_mappings")
      .upsert(canonicalColleges, { onConflict: "college_name" })

    if (upsertError) {
      console.error("Error upserting college mappings:", upsertError)
      throw upsertError
    }

    return NextResponse.json({
      success: true,
      message: "College division mappings updated (canonical list upserted). Refresh the Blue page.",
      count: rowCount,
    })
  } catch (error) {
    console.error("Error setting up college mappings table:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
