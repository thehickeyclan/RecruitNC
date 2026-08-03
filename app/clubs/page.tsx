import type { Metadata } from "next"
import Link from "next/link"
import { ClubLocatorMap } from "@/components/clubs/club-locator-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Search, ShieldCheck, Users } from "lucide-react"

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
    <main className="min-h-screen bg-[#061427] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.28),transparent_28%),radial-gradient(circle_at_75%_12%,rgba(251,191,36,0.18),transparent_25%),linear-gradient(135deg,#061427,#0b2444_50%,#061427)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <Badge className="mb-5 bg-amber-400 text-slate-950 hover:bg-amber-300">
              <MapPin className="mr-2 h-4 w-4" />
              RecruitNC Club Locator
            </Badge>
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              Find North Carolina wrestling clubs.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200 sm:text-xl">
              A public map of wrestling clubs and training centers across North Carolina, built from verified club
              records and connected to RecruitNC athlete, recruiting, and commitment data.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-red-600 text-white hover:bg-red-500">
                <a href="#club-map">Explore the map</a>
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                <Link href="/athletes">Search athletes</Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <Search className="h-6 w-6 text-amber-300" />
              <h2 className="mt-3 font-black">Search by club or city</h2>
              <p className="mt-2 text-sm text-slate-300">Quickly find nearby programs and training options.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <Users className="h-6 w-6 text-amber-300" />
              <h2 className="mt-3 font-black">Connected to RecruitNC</h2>
              <p className="mt-2 text-sm text-slate-300">See athlete counts, boys/girls totals, and commitment activity.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <ShieldCheck className="h-6 w-6 text-amber-300" />
              <h2 className="mt-3 font-black">Built for verification</h2>
              <p className="mt-2 text-sm text-slate-300">Alias support keeps duplicate club names from becoming duplicate pins.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="club-map" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ClubLocatorMap />
      </section>
    </main>
  )
}
