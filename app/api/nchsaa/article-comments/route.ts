import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 })
  try {
    const supabase = await createClient()
    const { data: comments, error } = await supabase
      .from("nchsaa_article_comments")
      .select("id, parent_id, author_name, content, created_at")
      .eq("article_slug", slug)
      .order("created_at", { ascending: true })
    if (error) throw error
    const topLevel = (comments ?? []).filter((c) => c.parent_id == null)
    const byParent = (comments ?? []).reduce((acc, c) => {
      if (c.parent_id != null) {
        if (!acc[c.parent_id]) acc[c.parent_id] = []
        acc[c.parent_id].push(c)
      }
      return acc
    }, {} as Record<number, typeof comments>)
    const tree = topLevel.map((c) => ({
      ...c,
      replies: byParent[c.id] ?? [],
    }))
    return NextResponse.json({ comments: tree })
  } catch (e) {
    console.error("[RecruitNC] article-comments GET", e)
    return NextResponse.json({ comments: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slug, parentId, authorName, authorEmail, content } = body as {
      slug?: string
      parentId?: number
      authorName?: string
      authorEmail?: string
      content?: string
    }
    if (!slug || !authorName?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "slug, authorName, and content required" }, { status: 400 })
    }
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("nchsaa_article_comments")
      .insert({
        article_slug: slug,
        parent_id: parentId ?? null,
        author_name: authorName.trim(),
        author_email: authorEmail?.trim() || null,
        content: content.trim(),
      })
      .select("id, parent_id, author_name, content, created_at")
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error("[RecruitNC] article-comments POST", e)
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 })
  }
}
