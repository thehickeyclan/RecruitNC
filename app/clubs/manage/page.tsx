import type { Metadata } from "next"
import Link from "next/link"
import { ClubManageClient } from "@/components/clubs/club-manage-client"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Manage your club | RecruitNC",
  description: "Coaches and club owners keep their RecruitNC club listing current.",
  // A personal management screen, not something to index.
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function ClubManagePage() {
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <Link href="/clubs" className="text-sm font-bold text-[#D7B968] hover:text-white">
            ← Club locator
          </Link>
          <p className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.32em] text-[#D7B968]">
            <ShieldCheck className="h-4 w-4" />
            Club management
          </p>
          <h1 className={`mt-4 text-5xl leading-[0.95] text-white sm:text-6xl ${tocDisplayClass()}`}>
            Manage your club
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            Keep your address, programs, contact details and socials current. Changes go live on the public club map
            straight away.
          </p>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <ClubManageClient />
      </section>
    </main>
  )
}
