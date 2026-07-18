import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react"
import { getUnitedAscentIssues } from "@/lib/news"

export const metadata = {
  title: "United Ascent | North Carolina Wrestling News",
  description:
    "The weekly record of the people, performances and progress driving North Carolina wrestling forward.",
}

export default function UnitedAscentArchivePage() {
  const issues = getUnitedAscentIssues()

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <header className="border-b border-white/10 bg-gradient-to-br from-[#13294B] to-[#0A1628]">
        <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
          <Link href="/news" className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All news
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D3B574]">North Carolina Wrestling News</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">UNITED ASCENT</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/65">
            The weekly record of the people, performances and progress driving North Carolina wrestling forward.
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              href={issue.href}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#13294B] transition hover:border-[#D3B574]/60 hover:shadow-xl"
            >
              <div className={`relative aspect-[3/4] ${issue.imageBannerBgClass ?? "bg-slate-100"}`}>
                {issue.image ? (
                  <Image
                    src={issue.image}
                    alt={`${issue.title} cover`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : null}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/45">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(`${issue.date}T12:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <h2 className="mt-3 text-lg font-bold leading-snug group-hover:text-[#D3B574]">{issue.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/55">{issue.summary}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D3B574]">
                  Read issue <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
