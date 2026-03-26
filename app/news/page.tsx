import Link from "next/link"
import Image from "next/image"
import { getAllNews } from "@/lib/news"
import { FileText } from "lucide-react"

export const metadata = {
  title: "News & Updates | NC United Wrestling",
  description: "News, announcements, and updates from NC United Wrestling.",
}

export default function NewsPage() {
  const items = getAllNews()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-3xl md:max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#003366] hover:underline"
          >
            ← Home
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-[#003366] mb-2">News &amp; Updates</h1>
        <p className="text-slate-600 mb-8">
          Announcements, articles, and highlights from NC United Wrestling.
        </p>

        <ul className="space-y-6">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {item.newsListBanner && item.image ? (
                  <>
                    <div
                      className={`relative h-48 w-full border-b border-slate-100 sm:h-56 md:h-72 ${
                        item.imageFit === "contain" ? "bg-white" : "bg-slate-100"
                      }`}
                    >
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className={`${
                          item.imageFit === "contain"
                            ? "object-contain object-center p-3 sm:p-6"
                            : `object-cover ${item.imagePosition === "top" ? "object-top" : "object-center"}`
                        }`}
                        sizes="(max-width: 768px) 100vw, 56rem"
                      />
                    </div>
                    <div className="p-5">
                      {item.category && (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${item.categoryBadgeClass ?? "bg-[#003366]"}`}
                        >
                          {item.category}
                        </span>
                      )}
                      <h2 className="mt-2 text-lg font-semibold text-[#003366] group-hover:underline md:text-xl">
                        {item.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {item.readTime && ` · ${item.readTime}`}
                      </p>
                      <p className="mt-3 text-sm font-medium text-[#003366] group-hover:underline">
                        Full Article →
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-4 p-5">
                    {item.image ? (
                      <div
                        className={`relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg ${item.imageFit === "contain" ? "bg-white" : "bg-slate-100"}`}
                      >
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          className={`${item.imageFit === "contain" ? "object-contain" : "object-cover"} ${item.imagePosition === "top" ? "object-top" : "object-center"}`}
                          sizes="128px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-32 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <FileText className="h-8 w-8 text-slate-300" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {item.category && (
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${item.categoryBadgeClass ?? "bg-[#003366]"}`}
                        >
                          {item.category}
                        </span>
                      )}
                      <h2 className="mt-2 font-semibold text-[#003366] group-hover:underline">
                        {item.title}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {item.summary}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {item.readTime && ` · ${item.readTime}`}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[#003366] group-hover:underline">
                        Full Article →
                      </p>
                    </div>
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
