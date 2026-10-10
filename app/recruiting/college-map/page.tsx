import type { Metadata } from "next"

import { CollegeProgramMap } from "@/components/colleges/college-program-map"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"

export const metadata: Metadata = {
  title: "College Wrestling Program Map | RecruitNC",
  description:
    "Every college wrestling program in the country for 2026-27 — NCAA Division I, II, III, NAIA and NJCAA, men's and women's — on one map.",
  openGraph: {
    title: "College Wrestling Program Map | RecruitNC",
    description: "Every NCAA, NAIA and NJCAA wrestling program for 2026-27, men's and women's, on one map.",
    url: "/recruiting/college-map",
    type: "website",
  },
}

export default function CollegeMapPage() {
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#D7B968]">
            RecruitNC · Recruiting Portal
          </p>
          <h1 className={`mt-4 text-5xl leading-[0.95] text-white sm:text-6xl ${tocDisplayClass()}`}>
            College program map
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">
            Every college wrestling program competing in 2026-27: NCAA Division I, II and III, NAIA and junior
            college, men&apos;s and women&apos;s. Most wrestlers who keep competing do it outside Division I — start
            your list wide.
          </p>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CollegeProgramMap accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} />
      </section>
    </main>
  )
}
