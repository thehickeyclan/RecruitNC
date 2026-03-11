import { readFile } from "fs/promises"
import { join } from "path"
import Image from "next/image"
import { articleMarkdownToHtml } from "@/lib/article-markdown"
import { HardLink } from "@/components/hard-link"
import { ShareArticleLinks } from "@/components/share-article-links"

export const dynamic = "force-static"
export const revalidate = 86400

export default async function RecruitingTournamentsPage() {
  const path = join(process.cwd(), "docs", "nc-wrestling-recruiting-tournament-article.md")
  let rawMd: string
  try {
    rawMd = await readFile(path, "utf-8")
  } catch {
    rawMd = "# Article not found\n\nContent could not be loaded."
  }
  const html = articleMarkdownToHtml(rawMd)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e50] via-[#13294B] to-[#1e3a5f]">
      <header className="w-full overflow-hidden bg-[#0a1e50]">
        <div className="relative w-full h-[260px] md:h-[420px] lg:h-[480px]">
          <Image
            src="/images/recruiting-tournaments-hero.png"
            alt="The 5 most impactful tournaments for NC college recruiting"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <HardLink
            href="/news"
            className="text-white/80 hover:text-white text-sm"
          >
            ← Back to News
          </HardLink>
          <ShareArticleLinks
            title="The 5 Most Impactful Tournaments on North Carolina's Path to College Recruiting"
            path="/recruiting/tournaments"
          />
        </div>
        <div className="mb-6 rounded-lg border-2 border-white/30 bg-white/10 px-5 py-4">
          <p className="text-base font-semibold text-white">
            <span aria-hidden className="mr-1.5 text-lg">👍</span> Primary path: NHSCA Nationals, Super32, College Opens, NHSCA Duals, Journeymen
          </p>
          <p className="mt-2 text-base font-semibold text-white">
            <span aria-hidden className="mr-1.5 text-lg">👎</span> Not in primary path: Fargo, Junior National Duals (see analysis below)
          </p>
        </div>
        <article
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-8 rounded-lg border-2 border-white/30 bg-white/10 px-5 py-4">
          <p className="text-base font-semibold text-white">
            <span aria-hidden className="mr-1.5 text-lg">👍</span> Primary path: NHSCA Nationals, Super32, College Opens, NHSCA Duals, Journeymen
          </p>
          <p className="mt-2 text-base font-semibold text-white">
            <span aria-hidden className="mr-1.5 text-lg">👎</span> Not in primary path: Fargo, Junior National Duals
          </p>
        </div>
        <div className="mt-10 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
          <HardLink
            href="/news"
            className="text-white/80 hover:text-white"
          >
            ← Back to News
          </HardLink>
          <ShareArticleLinks
            title="The 5 Most Impactful Tournaments on North Carolina's Path to College Recruiting"
            path="/recruiting/tournaments"
          />
        </div>
      </div>
    </div>
  )
}
