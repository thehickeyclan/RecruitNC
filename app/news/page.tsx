import Link from "next/link"
import Image from "next/image"
import { getAllNews } from "@/lib/news"
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react"

export const metadata = {
  title: "News & Updates | NC United Wrestling",
  description: "News, announcements, and updates from NC United Wrestling.",
}

export default function NewsPage() {
  const items = getAllNews()
  const [featured, ...rest] = items

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* Hero Header */}
      <header className="relative bg-gradient-to-br from-[#13294B] via-[#1a3a5c] to-[#0A1628] border-b border-white/10">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            News & Updates
          </h1>
          <p className="mt-4 text-lg text-white/60 max-w-2xl">
            The latest announcements, stories, and highlights from NC United Wrestling.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-16">
        {/* Featured Story */}
        {featured && (
          <section className="mb-16">
            <Link
              href={featured.href}
              className="group block overflow-hidden rounded-2xl bg-[#13294B] border border-white/10 hover:border-[#D3B574]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#D3B574]/5"
            >
              <div className="grid md:grid-cols-2 gap-0">
                {/* Image */}
                <div
                  className={`relative aspect-[16/10] md:aspect-auto md:min-h-[400px] overflow-hidden ${
                    featured.imageBannerBgClass ?? "bg-[#1a3a5c]"
                  }`}
                >
                  {featured.image ? (
                    <Image
                      src={featured.image}
                      alt=""
                      fill
                      className={`transition-transform duration-500 group-hover:scale-105 ${
                        featured.imageFit === "contain"
                          ? "object-contain object-center p-3 sm:p-4"
                          : "object-cover"
                      } ${featured.imagePosition === "top" ? "object-top" : "object-center"}`}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a5c] to-[#13294B]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13294B]/80 via-transparent to-transparent md:hidden" />
                </div>

                {/* Content */}
                <div className="relative p-6 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    {featured.category && (
                      <span className="inline-block rounded-full bg-[#D3B574] px-3 py-1 text-xs font-semibold text-[#13294B] uppercase tracking-wide">
                        {featured.category}
                      </span>
                    )}
                    <span className="text-sm text-white/50 uppercase tracking-wide">Featured</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight group-hover:text-[#D3B574] transition-colors">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-white/70 line-clamp-3 text-base md:text-lg leading-relaxed">
                    {featured.summary}
                  </p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Calendar className="h-4 w-4" />
                      {new Date(featured.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                      {featured.readTime && <span>· {featured.readTime}</span>}
                    </div>
                    <span className="inline-flex items-center gap-2 text-[#D3B574] font-medium group-hover:gap-3 transition-all">
                      Read Article
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Rest of Articles */}
        {rest.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-8">
              More Stories
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group block overflow-hidden rounded-xl bg-[#13294B]/50 border border-white/10 hover:border-[#D3B574]/30 transition-all duration-300 hover:bg-[#13294B]"
                >
                  {/* Card Image */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#1a3a5c]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                          item.imageFit === "contain" ? "object-contain p-4" : ""
                        } ${item.imagePosition === "top" ? "object-top" : "object-center"}`}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white/20">NC</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    {item.category && (
                      <span className="inline-block rounded-full bg-[#D3B574]/20 text-[#D3B574] px-2.5 py-0.5 text-xs font-medium mb-3">
                        {item.category}
                      </span>
                    )}
                    <h3 className="font-semibold text-white group-hover:text-[#D3B574] transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/50 line-clamp-2">
                      {item.summary}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                      <span>
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {item.readTime && <span>{item.readTime}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/50">No news articles available.</p>
          </div>
        )}
      </main>
    </div>
  )
}
