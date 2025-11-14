import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    console.log("Creating media_items table...")

    const supabase = createClient()

    // Try to create the table by inserting a test record
    // If the table doesn't exist, this will fail and we'll provide SQL
    const testRecord = {
      file_name: "test-logo.png",
      college_name: "Test College",
      alt_text: "Test",
      division: "NCAA Division I",
      entity_type: "college",
      url: "https://example.com/test.png",
      blob_url: "https://example.com/test.png",
      file_size: 1024,
      mime_type: "image/png",
      description: "Test record",
      is_active: true,
    }

    const { data, error } = await supabase.from("media_items").insert([testRecord]).select()

    if (error) {
      console.error("Insert error:", error)

      // If table doesn't exist, provide SQL to create it
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        const createTableSQL = `
-- Create media_items table
CREATE TABLE media_items (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  college_name TEXT,
  alt_text TEXT,
  division TEXT,
  entity_type TEXT DEFAULT 'college',
  url TEXT,
  blob_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_media_items_college_name ON media_items(college_name);
CREATE INDEX idx_media_items_entity_type ON media_items(entity_type);
CREATE INDEX idx_media_items_is_active ON media_items(is_active);

-- Insert some sample data
INSERT INTO media_items (file_name, college_name, alt_text, division, entity_type, url, blob_url, file_size, mime_type, description) VALUES
('roanoke-college-logo.png', 'Roanoke College', 'Roanoke, RC', 'NCAA Division III', 'college', '/roanoke-college-logo.png', '/roanoke-college-logo.png', 2048, 'image/png', 'Official Roanoke College logo'),
('unc-chapel-hill-logo.png', 'University of North Carolina at Chapel Hill', 'UNC, Tar Heels, North Carolina', 'NCAA Division I', 'college', '/unc-chapel-hill-logo.png', '/unc-chapel-hill-logo.png', 3072, 'image/png', 'Official UNC Chapel Hill logo'),
('nc-state-logo.png', 'North Carolina State University', 'NC State, NCSU, Wolfpack', 'NCAA Division I', 'college', '/nc-state-logo.png', '/nc-state-logo.png', 2560, 'image/png', 'Official NC State logo');
        `

        return NextResponse.json({
          success: false,
          needsManualSetup: true,
          error: "Table doesn't exist. Please run this SQL in your Supabase dashboard:",
          sql: createTableSQL,
          instructions: [
            "1. Go to your Supabase dashboard",
            "2. Navigate to SQL Editor",
            "3. Paste the SQL above and run it",
            "4. Refresh this page",
          ],
        })
      }

      return NextResponse.json({
        success: false,
        error: error.message,
      })
    }

    // Delete the test record
    if (data && data.length > 0) {
      await supabase.from("media_items").delete().eq("id", data[0].id)
    }

    return NextResponse.json({
      success: true,
      message: "Media items table is ready!",
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
