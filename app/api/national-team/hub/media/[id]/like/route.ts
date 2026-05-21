import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  isMissingNhscaHubMediaLikesTableError,
  isMissingNhscaHubMediaTableError,
  NHSCA_HUB_MEDIA_LIKES_TABLE,
  NHSCA_HUB_MEDIA_TABLE,
} from "@/lib/nhsca-hub-media"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing media id." }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: media, error: mediaErr } = await admin
    .from(NHSCA_HUB_MEDIA_TABLE)
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (mediaErr) {
    if (isMissingNhscaHubMediaTableError(mediaErr.message)) {
      return NextResponse.json({ error: "Media gallery is not set up yet." }, { status: 503 })
    }
    return NextResponse.json({ error: mediaErr.message }, { status: 500 })
  }
  if (!media) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const { data: existing, error: fetchErr } = await admin
    .from(NHSCA_HUB_MEDIA_LIKES_TABLE)
    .select("media_id")
    .eq("media_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (fetchErr) {
    if (isMissingNhscaHubMediaLikesTableError(fetchErr.message)) {
      return NextResponse.json(
        {
          error: "Likes are not set up yet. Run scripts/supabase-nhsca-hub-media-likes.sql in Supabase.",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (existing) {
    const { error: delErr } = await admin
      .from(NHSCA_HUB_MEDIA_LIKES_TABLE)
      .delete()
      .eq("media_id", id)
      .eq("user_id", user.id)
    if (delErr) {
      console.error("[RecruitNC] nhsca hub media unlike", delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }
  } else {
    const { error: insErr } = await admin.from(NHSCA_HUB_MEDIA_LIKES_TABLE).insert({
      media_id: id,
      user_id: user.id,
    })
    if (insErr) {
      console.error("[RecruitNC] nhsca hub media like", insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  }

  const { count, error: countErr } = await admin
    .from(NHSCA_HUB_MEDIA_LIKES_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("media_id", id)

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 })
  }

  return NextResponse.json({
    likeCount: count ?? 0,
    likedByMe: !existing,
  })
}
