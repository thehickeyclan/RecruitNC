import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 })
  try {
    const supabase = await createClient()
    const { data: rows } = await supabase
      .from("nchsaa_article_reactions")
      .select("reaction")
      .eq("article_slug", slug)
    const up = rows?.filter((r) => r.reaction === "up").length ?? 0
    const down = rows?.filter((r) => r.reaction === "down").length ?? 0
    return NextResponse.json({ up, down })
  } catch (e) {
    console.error("[RecruitNC] article-reactions GET", e)
    return NextResponse.json({ up: 0, down: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, reaction, guestId } = body as { slug?: string; reaction?: "up" | "down"; guestId?: string }
    if (!slug || !reaction || reaction !== "up" && reaction !== "down") {
      return NextResponse.json({ error: "slug and reaction (up|down) required" }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null
    if (!userId && !guestId) return NextResponse.json({ error: "guestId required when not signed in" }, { status: 400 })

    if (userId) {
      await supabase.from("nchsaa_article_reactions").delete().eq("article_slug", slug).eq("user_id", userId)
    } else {
      await supabase.from("nchsaa_article_reactions").delete().eq("article_slug", slug).is("user_id", null).eq("guest_id", guestId!)
    }
    await supabase.from("nchsaa_article_reactions").insert({
      article_slug: slug,
      reaction,
      user_id: userId,
      guest_id: userId ? null : (guestId || null),
    })
    const { data: rows } = await supabase.from("nchsaa_article_reactions").select("reaction").eq("article_slug", slug)
    const up = rows?.filter((r) => r.reaction === "up").length ?? 0
    const down = rows?.filter((r) => r.reaction === "down").length ?? 0
    return NextResponse.json({ up, down })
  } catch (e) {
    console.error("[RecruitNC] article-reactions POST", e)
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 })
  }
}
