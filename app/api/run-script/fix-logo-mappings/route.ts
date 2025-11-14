import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Fix Appalachian State mappings
        UPDATE logo_mappings
        SET entity_name = 'Appalachian State University'
        WHERE entity_type = 'college' AND (
          entity_name ILIKE 'app%state%' OR 
          entity_name ILIKE 'appalachian%'
        );

        -- Fix McDowell mappings
        UPDATE logo_mappings
        SET entity_name = 'McDowell High School'
        WHERE entity_type = 'highschool' AND (
          entity_name ILIKE '%mcdowell%'
        );

        -- Fix Cardinal Gibbons mappings
        UPDATE logo_mappings
        SET entity_name = 'Cardinal Gibbons High School'
        WHERE entity_type = 'highschool' AND (
          entity_name ILIKE '%cardinal%gibbons%' OR
          entity_name ILIKE '%gibbons%'
        );

        -- Fix RAW Wrestling Club mappings
        UPDATE logo_mappings
        SET entity_name = 'RAW Wrestling Club'
        WHERE entity_type = 'club' AND (
          entity_name ILIKE '%raw%' OR
          entity_name ILIKE '%r.a.w%'
        );

        -- Fix Team Tar Heel mappings
        UPDATE logo_mappings
        SET entity_name = 'Team Tar Heel'
        WHERE entity_type = 'club' AND (
          entity_name ILIKE '%tar%heel%'
        );
      `,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Logo mappings fixed successfully",
    })
  } catch (error) {
    console.error("Error fixing logo mappings:", error)
    return NextResponse.json({ error: "Failed to fix logo mappings" }, { status: 500 })
  }
}
