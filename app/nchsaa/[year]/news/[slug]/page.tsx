import { notFound } from "next/navigation"
import { getArticle } from "../articles"
import { SevenDivisionsArticleContent } from "../content/seven-divisions-98-brackets-784-qualifiers"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

const ARTICLE_CONTENT: Record<string, () => JSX.Element> = {
  "seven-divisions-98-brackets-784-qualifiers": SevenDivisionsArticleContent,
}

export async function generateStaticParams() {
  return [{ year: "2026", slug: "seven-divisions-98-brackets-784-qualifiers" }]
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
          <a href={`/nchsaa/${year}`}>
            <Button variant="outline" size="sm" className="border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {year} Results
            </Button>
          </a>
        </div>
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#003366]">{article.title}</h1>
          {article.date && (
            <p className="text-slate-500 text-sm mt-2">{new Date(article.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </header>
        {article.published && ContentComponent ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 shadow-sm">
            <ContentComponent />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-600">
            <p>This article is coming soon.</p>
            <a href={`/nchsaa/${year}`} className="text-[#B91C1C] hover:underline mt-4 inline-block">
              Back to {year} NCHSAA Results
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
