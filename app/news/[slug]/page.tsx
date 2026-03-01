import { notFound } from "next/navigation"
import Link from "next/link"
import { getAnnouncementBySlug, getAnnouncementSlugs } from "@/lib/news"
import { FirstFlight2026Content } from "../content/first-flight-2026-nc-united-shoe"

const ANNOUNCEMENT_CONTENT: Record<string, () => JSX.Element> = {
  "first-flight-2026-nc-united-shoe": () => <FirstFlight2026Content />,
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
        <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6 md:p-8 shadow-sm overflow-x-hidden">
          <Content />
        </div>
      </div>
    </div>
  )
}
