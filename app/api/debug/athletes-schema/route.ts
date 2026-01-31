import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/debug/athletes-schema
 * Returns actual column names of the athletes table (from a sample row + information_schema).
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: sample } = await supabase.from("athletes").select("*").limit(1).maybeSingle()
    const columnsFromRow = sample ? Object.keys(sample) : []

    const { data: schemaCols } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type")
      .eq("table_schema", "public")
      .eq("table_name", "athletes")
      .order("ordinal_position")

    const columnsFromSchema = (schemaCols || []).map((c: { column_name: string }) => c.column_name)

    return NextResponse.json({
      columnsFromRow,
      columnsFromSchema,
      columns: [...new Set([...columnsFromRow, ...columnsFromSchema])].sort(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    )
  }
}
