import Image from "next/image"
import Link from "next/link"
import { ArrowRight, History } from "lucide-react"
import { AthletesLegacySearchContent } from "@/components/athletes-legacy-search-content"
import { shareMetadata } from "@/lib/share-metadata"

export const metadata = shareMetadata({
  title: "Wrestlers",
  description: "Search North Carolina wrestling history by name: NCHSAA, NHSCA, Super 32 and awards.",
  path: "/wrestlers",
  kicker: "LegacyNC",
})

/** LegacyNC's wrestler search. It was a tab on the commitments page (/athletes?tab=legacy). */
export default function WrestlersPage() {
  return (
    <main className="min-h-screen bg-[#0A1628]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image src="/hero-banner-nchsaa-2026-arena.png" alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/95 via-[#0A1628]/85 to-[#0A1628]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-transparent to-transparent" />
        </div>
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <div className="mb-3 flex items-center gap-4">
            <div className="rounded-xl bg-[#D3B574]/10 p-3 backdrop-blur-sm">
              <History className="h-7 w-7 text-[#D3B574] md:h-8 md:w-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Wrestlers</h1>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            Search North Carolina wrestling history by name: NCHSAA, NHSCA, Super 32 and awards.
          </p>
          <Link
            href="/prospects/all"
            className="mt-6 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#D3B574] px-4 text-sm font-bold text-[#D3B574] transition-colors hover:bg-[#D3B574] hover:text-[#0A1628]"
          >
            Browse current wrestler profiles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <AthletesLegacySearchContent />
    </main>
  )
}
