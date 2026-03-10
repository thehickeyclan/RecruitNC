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
      {/* Hero banner - new image; full visibility on desktop, no top crop */}
      <div className="relative w-full bg-[#0a1e50] flex items-center justify-center min-h-[220px] md:min-h-[320px]">
        <Image
          src="/images/recruiting-tournaments-hero.png"
          alt="The 5 Most Impactful Tournaments for NC College Recruiting"
          width={1200}
          height={675}
          className="w-full h-auto object-contain max-h-[45vh] md:max-h-[min(420px,55vh)]"
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />
      </div>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <HardLink
            href="/recruiting"
            className="text-white/80 hover:text-white text-sm"
          >
            ← Recruiting Guide
          </HardLink>
          <ShareArticleLinks
            title="The 5 Most Impactful Tournaments on North Carolina's Path to College Recruiting"
            path="/recruiting/tournaments"
          />
        </div>
        <article
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-10 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
          <HardLink
            href="/recruiting"
            className="text-white/80 hover:text-white"
          >
            ← Back to Recruiting Guide
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
