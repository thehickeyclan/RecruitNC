import { readFile } from "fs/promises"
import { join } from "path"
import Image from "next/image"
import { articleMarkdownToHtml } from "@/lib/article-markdown"
import { HardLink } from "@/components/hard-link"
import { ShareArticleLinks } from "@/components/share-article-links"
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"
import { ArrowLeft, Calendar, Clock, Trophy, User } from "lucide-react"

export const dynamic = "force-static"
export const revalidate = 86400

const ARTICLE_TITLE =
  "The 5 Most Impactful Tournaments on North Carolina's Path to College Recruiting"
const ARTICLE_PATH = "/recruiting/tournaments"
const ARTICLE_DATE = "2026-03-10"
const ARTICLE_READ_TIME = "12 min read"
const ARTICLE_SUBTITLE =
  "Data from 87 North Carolina college commits (Classes of 2025–2026) on which tournaments appear most often in recruiting journeys."

function stripLeadingTitle(md: string): string {
  return md.replace(/^#\s+.+\n+/, "")
}

export default async function RecruitingTournamentsPage() {
  const path = join(process.cwd(), "docs", "nc-wrestling-recruiting-tournament-article.md")
  let rawMd: string
  try {
    rawMd = await readFile(path, "utf-8")
  } catch {
    rawMd = "# Article not found\n\nContent could not be loaded."
  }
  const html = articleMarkdownToHtml(stripLeadingTitle(rawMd))

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src="/hero-banner-nchsaa-2026-arena.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/88 to-[#0A1628]/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/40 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 py-10 md:py-14 max-w-4xl">
          <HardLink
            href="/news"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/55 hover:text-[#D3B574] transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            All News
          </HardLink>

          <div className="grid gap-8 lg:grid-cols-[1fr_min(280px,34%)] lg:items-start">
            <div className="max-w-3xl">
              <span className="inline-block rounded-full bg-[#D3B574] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0A1628] mb-4">
                Recruiting
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight text-balance">
                {ARTICLE_TITLE}
              </h1>
              <p className="mt-4 text-lg text-white/70 leading-relaxed">{ARTICLE_SUBTITLE}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {new Date(ARTICLE_DATE).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="inline-flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0" />
                  NC United Wrestling
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  {ARTICLE_READ_TIME}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Trophy className="h-4 w-4 shrink-0 text-[#D3B574]" />
                  87 commits analyzed
                </span>
              </div>
            </div>

            {/* Featured graphic — contained, not full-bleed banner */}
            <div className="relative mx-auto w-full max-w-xs lg:max-w-none rounded-xl border border-white/10 bg-[#0f1c2e]/80 p-3 shadow-xl backdrop-blur-sm">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-[#0A1628]">
                <Image
                  src="/images/recruiting-tournaments-hero.png"
                  alt="NC wrestling recruiting tournaments analysis"
                  fill
                  className="object-contain object-top p-1"
                  sizes="(max-width: 1024px) 280px, 320px"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <ShareArticleLinks title={ARTICLE_TITLE} path={ARTICLE_PATH} />
          </div>
        </div>
      </header>

      {/* Article */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1c2e] shadow-xl">
          <div className="flex flex-col gap-3 border-b border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="[&_.text-slate-600]:text-white/70 [&_.text-sm.font-medium]:text-white/80">
              <NchsaaArticleReactions articleSlug="recruiting-tournaments" />
            </div>
          </div>

          <div
            className="p-4 sm:p-6 md:p-10 max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="border-t border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="[&_.text-slate-600]:text-white/70 [&_.text-sm.font-medium]:text-white/80">
              <NchsaaArticleReactions articleSlug="recruiting-tournaments" />
            </div>
          </div>
        </article>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
          <HardLink
            href="/news"
            className="inline-flex items-center gap-2 text-[#D3B574] hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All News
          </HardLink>
          <ShareArticleLinks title={ARTICLE_TITLE} path={ARTICLE_PATH} />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <HardLink
            href="/colleges"
            className="block rounded-xl border border-white/10 bg-[#0f1c2e] p-5 transition-colors hover:border-[#D3B574]/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#D3B574] mb-1">Explore</p>
            <p className="font-semibold text-white">College Commit Rankings</p>
            <p className="text-sm text-white/55 mt-1">See where NC wrestlers are landing by program.</p>
          </HardLink>
          <HardLink
            href="/public-rankings"
            className="block rounded-xl border border-white/10 bg-[#0f1c2e] p-5 transition-colors hover:border-[#D3B574]/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#D3B574] mb-1">Explore</p>
            <p className="font-semibold text-white">Prospect Rankings</p>
            <p className="text-sm text-white/55 mt-1">Official RecruitNC class rankings by grad year.</p>
          </HardLink>
        </div>
      </main>
    </div>
  )
}
