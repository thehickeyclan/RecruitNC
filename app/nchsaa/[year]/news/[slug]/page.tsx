import { notFound } from "next/navigation"
import { getArticle } from "../articles"
import { SevenDivisionsArticleContent } from "../content/seven-divisions-98-brackets-784-qualifiers"
import { UnderstandingBracketDepth2026Content } from "../content/understanding-bracket-depth-2026"
import { ThreeJoinTheImmortals2026Content } from "../content/three-join-the-immortals-2026"
import { BackToYearLink } from "../back-to-year-link"
import { NchsaaArticleReactions } from "@/components/nchsaa-article-reactions"
import { NchsaaArticleComments } from "@/components/nchsaa-article-comments"

const ARTICLE_CONTENT: Record<string, () => JSX.Element> = {
  "seven-divisions-98-brackets-784-qualifiers": SevenDivisionsArticleContent,
  "article-2": UnderstandingBracketDepth2026Content,
  "three-join-the-immortals-2026": ThreeJoinTheImmortals2026Content,
}

export async function generateStaticParams() {
  return [
    { year: "2026", slug: "seven-divisions-98-brackets-784-qualifiers" },
    { year: "2026", slug: "article-2" },
    { year: "2026", slug: "three-join-the-immortals-2026" },
  ]
}

export default async function NCHSAAArticlePage({
  params,
}: {
  params: Promise<{ year: string; slug: string }>
}) {
  const { year, slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const ContentComponent = ARTICLE_CONTENT[slug]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <BackToYearLink year={year} />
        </div>
        <header className="mb-6">
          <NchsaaArticleReactions articleSlug={slug} />
          <h1 className="text-2xl md:text-3xl font-bold text-[#003366] mt-4">{article.title}</h1>
          {article.date && (
            <p className="text-slate-500 text-sm mt-2">{new Date(article.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </header>
        {article.published && ContentComponent ? (
          <>
            <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm">
              <ContentComponent />
              <div className="mt-6 pt-6 border-t border-slate-200">
                <NchsaaArticleReactions articleSlug={slug} />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm mt-6">
              <NchsaaArticleComments articleSlug={slug} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-600">
            <p>This article is coming soon.</p>
            <div className="mt-4">
              <BackToYearLink year={year} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
