import type { Metadata } from "next"
import Link from "next/link"
import { ClubLocatorMap } from "@/components/clubs/club-locator-map"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { Search, ShieldCheck, Trophy, Users } from "lucide-react"

export const metadata: Metadata = {
  title: "North Carolina Wrestling Club Map | RecruitNC",
  description:
    "Find wrestling clubs and training centers across North Carolina with RecruitNC athlete counts, girls and boys participation, websites, logos, and college commitment activity.",
  openGraph: {
    title: "North Carolina Wrestling Club Map | RecruitNC",
    description:
      "Explore wrestling clubs and training centers across North Carolina with RecruitNC athlete and college commitment data.",
    url: "/clubs",
    type: "website",
  },
}

export default function ClubsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#060f1f] text-white">
      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#CC0000]/20 blur-3xl" />
        <div className="absolute left-8 top-20 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#D7B968]">
              RecruitNC · North Carolina Wrestling
            </p>
            <h1 className={`mt-5 max-w-4xl text-5xl leading-[0.92] text-white sm:text-7xl ${tocDisplayClass()}`}>
              Club locator
            </h1>
            <p className={`mt-3 text-3xl leading-none text-white/95 sm:text-5xl ${tocDisplayClass()}`}>
              Find the rooms building North Carolina wrestling.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
              A public directory of wrestling clubs and training centers across North Carolina — connected to
              RecruitNC athletes, verified locations, and the data that shows where talent is developing.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#club-map"
                className={`inline-flex min-h-12 items-center justify-center rounded-sm bg-[#CC0000] px-6 py-3 text-lg text-white shadow-lg shadow-black/20 transition hover:bg-[#a80000] ${tocDisplayClass()}`}
              >
                Explore the map
              </a>
              <Link
                href="/athletes"
                className={`inline-flex min-h-12 items-center justify-center rounded-sm border-2 border-white/25 px-6 py-3 text-lg text-white transition hover:bg-white/10 ${tocDisplayClass()}`}
              >
                Search athletes
              </Link>
              <Link
                href="/clubs/submit"
                className={`inline-flex min-h-12 items-center justify-center rounded-sm border-2 border-[#D7B968]/50 px-6 py-3 text-lg text-[#F5D985] transition hover:bg-[#D7B968]/10 ${tocDisplayClass()}`}
              >
                Submit a club
              </Link>
            </div>
          </div>

          <div className="rounded-sm border border-white/10 bg-[#061427]/80 p-5 shadow-2xl shadow-black/30">
            <div className="border-l-4 border-[#CC0000] pl-4">
              <p className={`text-3xl text-white ${tocDisplayClass()}`}>A smarter club directory</p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Clubs are matched through canonical records and aliases, so RAW, Raleigh Area Wrestling, and other
                common naming variations resolve to one verified program instead of messy duplicate listings.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Search, label: "Search", text: "Find clubs by name, city, or website." },
                { icon: Users, label: "Athlete data", text: "See RecruitNC athlete totals by program." },
                { icon: Trophy, label: "Commitments", text: "Surface recent college commitment activity." },
                { icon: ShieldCheck, label: "Verified", text: "Separate confirmed clubs from profile text." },
              ].map(({ icon: Icon, label, text }) => (
                <div key={label} className="rounded-sm border border-white/10 bg-white/[0.04] p-4">
                  <Icon className="h-5 w-5 text-[#D7B968]" />
                  <h2 className={`mt-3 text-xl text-white ${tocDisplayClass()}`}>{label}</h2>
                  <p className="mt-1 text-sm leading-5 text-white/55">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-sm border border-[#D7B968]/20 bg-[#D7B968]/10 p-4">
              <p className="text-sm font-bold text-[#F5D985]">Missing a club?</p>
              <p className="mt-1 text-sm leading-6 text-white/60">
                Club owners, coaches, and parents can submit a club for review. A free RecruitNC account is required so
                we know who sent it and can follow up before publishing.
              </p>
            </div>
          </div>
        </div>
        <TocPatrioticBar />
      </section>

      <section id="club-map" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ClubLocatorMap accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ""} />
      </section>
    </main>
  )
}
