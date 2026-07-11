import { createNewsShareImage } from "@/lib/news-share-image"
import { getAnnouncementBySlug } from "@/lib/news"
import { parseNewsShareFormat } from "@/lib/news-share-formats"

export const runtime = "edge"

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params
  const item = getAnnouncementBySlug(slug)
  if (!item) {
    return new Response("Article not found", { status: 404 })
  }

  const format = parseNewsShareFormat(new URL(request.url).searchParams.get("format"))
  if (!format) {
    return new Response("Invalid format. Use ig-square, ig-story, ig-portrait, or facebook.", {
      status: 400,
    })
  }

  return createNewsShareImage(item, format)
}
