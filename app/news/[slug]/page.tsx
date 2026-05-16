import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MessageCircle, Calendar, User, Clock } from "lucide-react"
import { getAnnouncementBySlug, getAnnouncementSlugs } from "@/lib/news"
import { FirstFlight2026Content } from "../content/first-flight-2026-nc-united-shoe"
import { NhscaMostOutstandingWrestlerAward2026Content } from "../content/nhsca-most-outstanding-wrestler-award-2026"
import { NhscaNationalsRecap2026Content } from "../content/nhsca-nationals-recap-2026"
import { ClassOf2026SeniorSendoffContent } from "../content/class-of-2026-senior-sendoff"
import { LynchburgBuildingAProgramWithIntentionContent } from "../content/lynchburg-building-a-program-with-intention"
import { RealCostEliteWrestlingNcSmarterBuildContent } from "../content/real-cost-elite-wrestling-nc-smarter-build"
import { FindingFlowOnTheMatTheZoneContent } from "../content/finding-flow-on-the-mat-the-zone"
import { NchsaaArticleComments } from "@/components/nchsaa-article-comments"
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"

const ANNOUNCEMENT_CONTENT: Record<string, () => JSX.Element> = {
  "finding-flow-on-the-mat": () => <FindingFlowOnTheMatTheZoneContent />,
  "real-cost-elite-wrestling-nc-smarter-build": () => <RealCostEliteWrestlingNcSmarterBuildContent />,
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

  const skipHeroImage = slug === "class-of-2026-senior-sendoff" || slug === "real-cost-elite-wrestling-nc-smarter-build"

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Hero Header */}
      <header className="relative bg-gradient-to-br from-[#13294B] via-[#1a3a5c] to-[#0A1628]">
        {/* Hero Image */}
        {item.image && !skipHeroImage && (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={item.image}
              alt=""
              fill
              className={`object-cover opacity-30 ${
                item.imagePosition === "top" ? "object-top" : "object-center"
              }`}
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#13294B]/50 via-[#13294B]/80 to-[#0A1628]" />
          </div>
        )}

        <div className="relative container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          {/* Back Link */}
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            All News
          </Link>

          {/* Article Header */}
          <div className="max-w-3xl">
            {item.category && (
              <span className="inline-block rounded-full bg-[#D3B574] px-3 py-1 text-xs font-semibold text-[#13294B] uppercase tracking-wide mb-4">
                {item.category}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {item.title}
            </h1>
            {item.subtitle && (
              <p className="mt-4 text-xl text-white/70 leading-relaxed">
                {item.subtitle}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/50">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(item.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {item.author && (
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {item.author}
                </span>
              )}
              {item.readTime && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {item.readTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <article className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Reactions Bar */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between bg-slate-50">
            <NchsaaArticleReactions articleSlug={slug} />
            <a
              href="#article-feedback"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-[#13294B] transition-colors hover:bg-white hover:border-[#13294B]"
            >
              <MessageCircle className="h-4 w-4" />
              Leave Feedback
            </a>
          </div>

          {/* Article Body */}
          <div className="p-4 sm:p-6 md:p-10 prose prose-slate max-w-none prose-headings:text-[#13294B] prose-a:text-[#13294B] prose-strong:text-[#13294B]">
            <Content />
          </div>

          {/* Bottom Reactions */}
          <div className="border-t border-slate-200 p-4 sm:p-6 bg-slate-50">
            <NchsaaArticleReactions articleSlug={slug} />
          </div>
        </article>

        {/* Comments Section */}
        <section
          id="article-feedback"
          className="mt-8 bg-[#13294B]/50 rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Feedback & Comments</h2>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <NchsaaArticleComments articleSlug={slug} />
          </div>
        </section>

        {/* Back to News */}
        <div className="mt-8 text-center">
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-[#D3B574] hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All News
          </Link>
        </div>
      </main>
    </div>
  )
}
