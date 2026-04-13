import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { getAnnouncementBySlug, getAnnouncementSlugs } from "@/lib/news"
import { FirstFlight2026Content } from "../content/first-flight-2026-nc-united-shoe"
import { NhscaMostOutstandingWrestlerAward2026Content } from "../content/nhsca-most-outstanding-wrestler-award-2026"
import { NhscaNationalsRecap2026Content } from "../content/nhsca-nationals-recap-2026"
import { ClassOf2026SeniorSendoffContent } from "../content/class-of-2026-senior-sendoff"
import { LynchburgBuildingAProgramWithIntentionContent } from "../content/lynchburg-building-a-program-with-intention"
import { NchsaaArticleComments } from "@/components/nchsaa-article-comments"
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"

const ANNOUNCEMENT_CONTENT: Record<string, () => JSX.Element> = {
  "lynchburg-building-a-program-with-intention": () => <LynchburgBuildingAProgramWithIntentionContent />,
  "first-flight-2026-nc-united-shoe": () => <FirstFlight2026Content />,
  "nhsca-most-outstanding-wrestler-award-2026": () => <NhscaMostOutstandingWrestlerAward2026Content />,
  "nhsca-nationals-recap-2026": () => <NhscaNationalsRecap2026Content />,
  "class-of-2026-senior-sendoff": () => <ClassOf2026SeniorSendoffContent />,
}

export async function generateStaticParams() {
  return getAnnouncementSlugs().map((slug) => ({ slug }))
}

export default async function NewsAnnouncementPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = getAnnouncementBySlug(slug)
  if (!item) notFound()

  const Content = ANNOUNCEMENT_CONTENT[slug]
  if (!Content) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 rounded-md border-2 border-[#C20017] bg-transparent px-4 py-2 text-sm font-medium text-[#C20017] hover:bg-[#C20017] hover:text-white transition-colors"
          >
            ← All News
          </Link>
        </div>
        <header className="mb-6">
          {item.category && (
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${item.categoryBadgeClass ?? "bg-[#003366]"}`}
            >
              {item.category}
            </span>
          )}
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-[#003366]">
            {item.title}
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            {new Date(item.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>
        {/* Class of 2026 sendoff: hero lives inside article body to avoid duplicate asset. */}
        {item.image && slug !== "class-of-2026-senior-sendoff" ? (
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
            <div
              className={`relative w-full overflow-hidden ${
                item.imageFit === "contain"
                  ? "h-64 sm:h-72 md:h-96"
                  : "h-48 sm:h-56 md:h-72"
              }`}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className={
                  item.imageFit === "contain"
                    ? "object-contain object-center p-2 sm:p-4"
                    : [
                        "object-cover",
                        item.imagePosition === "top" ? "object-top" : "object-center",
                        item.imageBannerZoom
                          ? "origin-center scale-110 sm:scale-125 md:scale-[1.38]"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                }
                sizes="(max-width: 768px) 100vw, 48rem"
                priority
              />
            </div>
          </div>
        ) : null}
        <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm overflow-x-hidden">
          <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <NchsaaArticleReactions articleSlug={slug} />
            <a
              href="#article-feedback"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-[#003366] transition-colors hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4" />
              Leave feedback
            </a>
          </div>
          <Content />
          <div className="mt-6 border-t border-slate-200 pt-6">
            <NchsaaArticleReactions articleSlug={slug} />
          </div>
        </div>
        <div
          id="article-feedback"
          className="mt-6 bg-white rounded-lg border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm"
        >
          <NchsaaArticleComments articleSlug={slug} />
        </div>
      </div>
    </div>
  )
}
