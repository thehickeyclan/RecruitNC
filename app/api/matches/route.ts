import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    const { data, error } = await supabase.from("matches").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching matches:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ matches: data })
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to fetch matches" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const wrestler_id = searchParams.get("wrestler_id")

    if (!wrestler_id) {
      return Response.json({ error: "wrestler_id is required" }, { status: 400 })
    }

    const { error } = await supabase.from("matches").delete().eq("wrestler_id", wrestler_id)

    if (error) {
      console.error("Error deleting match:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, message: "Match data deleted successfully" })
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to delete match data" }, { status: 500 })
  }
}
