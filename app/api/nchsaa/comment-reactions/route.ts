import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const commentIds = searchParams.get("ids") // comma-separated
  if (!commentIds) return NextResponse.json({ error: "ids required" }, { status: 400 })
  const ids = commentIds.split(",").map((id) => parseInt(id, 10)).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({})
  try {
    const supabase = await createClient()
    const { data: rows } = await supabase
      .from("nchsaa_comment_reactions")
      .select("comment_id, reaction")
      .in("comment_id", ids)
    const byComment: Record<number, { up: number; down: number }> = {}
    for (const id of ids) byComment[id] = { up: 0, down: 0 }
    for (const r of rows ?? []) {
      if (r.reaction === "up") byComment[r.comment_id].up++
      else byComment[r.comment_id].down++
    }
    return NextResponse.json(byComment)
  } catch (e) {
    console.error("[RecruitNC] comment-reactions GET", e)
    return NextResponse.json({})
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { commentId, reaction, guestId } = body as { commentId?: number; reaction?: "up" | "down"; guestId?: string }
    if (!commentId || !reaction || (reaction !== "up" && reaction !== "down")) {
      return NextResponse.json({ error: "commentId and reaction (up|down) required" }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? null
    if (!userId && !guestId) return NextResponse.json({ error: "guestId required when not signed in" }, { status: 400 })

    if (userId) {
      await supabase.from("nchsaa_comment_reactions").delete().eq("comment_id", commentId).eq("user_id", userId)
    } else {
      await supabase.from("nchsaa_comment_reactions").delete().eq("comment_id", commentId).is("user_id", null).eq("guest_id", guestId!)
    }
    await supabase.from("nchsaa_comment_reactions").insert({
      comment_id: commentId,
      reaction,
      user_id: userId,
      guest_id: userId ? null : (guestId || null),
    })
    const { data: rows } = await supabase.from("nchsaa_comment_reactions").select("reaction").eq("comment_id", commentId)
    const up = rows?.filter((r) => r.reaction === "up").length ?? 0
    const down = rows?.filter((r) => r.reaction === "down").length ?? 0
    return NextResponse.json({ up, down })
  } catch (e) {
    console.error("[RecruitNC] comment-reactions POST", e)
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 })
  }
}
