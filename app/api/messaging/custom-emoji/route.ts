import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET: List all custom emoji for the composer picker and message rendering.
 * Public (no auth required) so message bodies can be parsed anywhere.
 */
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("custom_emoji")
    .select("id, slug, image_url, category, display_name, sort_order")
    .order("category")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true })

  if (error) {
    console.error("[custom-emoji GET]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ emoji: data ?? [] })
}
