import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  try {
    // First, get the raw data from the database
    const { data: rawData, error: rawError } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (rawError) {
      return NextResponse.json({ error: `Error fetching raw athlete data: ${rawError.message}` }, { status: 500 })
    }

    // Get all columns from the athletes table
    const { data: columnData, error: columnError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "athletes")

    if (columnError) {
      return NextResponse.json({ error: `Error fetching table columns: ${columnError.message}` }, { status: 500 })
    }

    const columns = columnData.map((col) => col.column_name)

    return NextResponse.json({
      id,
      rawData,
      columns,
      dataKeys: Object.keys(rawData || {}),
    })
  } catch (error) {
    console.error("Error in debug athlete form route:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
