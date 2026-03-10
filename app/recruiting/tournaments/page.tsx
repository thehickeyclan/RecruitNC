import { readFile } from "fs/promises"
import { join } from "path"
import { articleMarkdownToHtml } from "@/lib/article-markdown"
import { HardLink } from "@/components/hard-link"

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
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="mb-6">
          <HardLink
            href="/recruiting"
            className="text-white/80 hover:text-white text-sm"
          >
            ← Recruiting Guide
          </HardLink>
        </div>
        <article
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-10 pt-6 border-t border-white/20">
          <HardLink
            href="/recruiting"
            className="text-white/80 hover:text-white"
          >
            ← Back to Recruiting Guide
          </HardLink>
        </div>
      </div>
    </div>
  )
}
