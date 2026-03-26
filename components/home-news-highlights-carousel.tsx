"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { getFeaturedForHome, type NewsItem } from "@/lib/news"

export function HomeNewsHighlightsCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const featured = getFeaturedForHome(4)
  const mainStory = featured[0]
  const others = featured.slice(1)

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [checkScroll])

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = dir === "left" ? -320 : 320
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" })
      setTimeout(checkScroll, 300)
    }
  }

  if (featured.length === 0) return null

  return (
    <section className="mb-12" aria-label="News highlights">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: "#003366" }}>
          News &amp; Highlights
        </h2>
        <Link
          href="/news"
          className="text-sm font-medium text-[#003366] hover:underline"
        >
          All news →
        </Link>
      </div>

      <div className="space-y-6">
        {/* Main story — large card, links to post */}
        {mainStory && (
          <a
            href={mainStory.href}
            className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {mainStory.image ? (
              <div
                className={`relative w-full overflow-hidden border-b border-slate-100 ${
                  mainStory.imageFit === "contain"
                    ? "h-56 sm:h-72 md:h-[22rem] lg:h-[26rem] bg-white"
                    : "h-52 sm:h-64 md:h-80 lg:h-[22rem] bg-slate-100"
                }`}
              >
                <Image
                  src={mainStory.image}
                  alt=""
                  fill
                  className={[
                    "transition-transform",
                    mainStory.imageFit === "contain"
                      ? "object-contain object-center p-0"
                      : [
                          "object-cover",
                          mainStory.imagePosition === "top" ? "object-top" : "object-center",
                          mainStory.imageBannerZoom
                            ? "origin-center scale-110 sm:scale-125 md:scale-[1.38] lg:scale-[1.48]"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" "),
                    !mainStory.imageBannerZoom ? "group-hover:scale-[1.01]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
                  priority
                />
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center border-b border-slate-100 bg-slate-100" aria-hidden>
                <FileText className="h-14 w-14 text-slate-300" />
              </div>
            )}
            <div className="flex flex-col justify-center p-6 md:p-8">
              {mainStory.category && (
                <span
                  className={`mb-2 inline-block self-start rounded px-2 py-0.5 text-xs font-medium text-white ${mainStory.categoryBadgeClass ?? "bg-[#003366]"}`}
                >
                  {mainStory.category}
                </span>
              )}
              <h3 className="mb-2 text-xl font-bold text-[#003366] group-hover:underline md:text-2xl">
                {mainStory.title}
              </h3>
              <p className="mb-3 line-clamp-3 text-sm text-slate-600 md:text-base">{mainStory.summary}</p>
              <span className="inline-flex items-center text-sm font-medium text-[#003366]">
                Read article →
              </span>
            </div>
          </a>
        )}

        {/* Other stories — horizontal carousel */}
        {others.length > 0 && (
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scroll("left")}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 shadow-md transition hover:bg-white"
                aria-label="Previous stories"
              >
                <ChevronLeft className="h-5 w-5 text-[#003366]" />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/95 p-2 shadow-md transition hover:bg-white"
                aria-label="Next stories"
              >
                <ChevronRight className="h-5 w-5 text-[#003366]" />
              </button>
            )}
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-thin"
              style={{ scrollbarWidth: "thin" }}
            >
              {others.map((item) => (
                <StoryCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function StoryCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.href}
      className="group flex min-w-[280px] max-w-[320px] flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col">
        <div
          className={`relative aspect-[16/10] w-full shrink-0 ${item.imageFit === "contain" ? "bg-white" : "bg-slate-100"}`}
        >
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className={`transition-transform group-hover:scale-[1.02] ${item.imageFit === "contain" ? "object-contain object-center p-1.5" : "object-cover"} ${item.imageFit !== "contain" && item.imagePosition === "top" ? "object-top" : ""}`}
              sizes="320px"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100" aria-hidden>
              <FileText className="h-10 w-10 text-slate-300" />
            </div>
          )}
          {item.category && (
            <span
              className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-medium text-white ${item.categoryBadgeClass ?? "bg-[#003366]"}`}
            >
              {item.category}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h4 className="mb-1 line-clamp-2 font-semibold text-[#003366] group-hover:underline">
            {item.title}
          </h4>
          <p className="line-clamp-2 text-xs text-slate-600">{item.summary}</p>
          {item.readTime && (
            <span className="mt-2 text-xs text-slate-500">{item.readTime}</span>
          )}
        </div>
      </div>
    </a>
  )
}
