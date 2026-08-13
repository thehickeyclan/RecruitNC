import type { Metadata } from "next"
import Link from "next/link"
import { AdminClubsManager } from "@/components/clubs/admin-clubs-manager"
import { AdminClubDirectory } from "@/components/clubs/admin-club-directory"
import { AdminClubClaims } from "@/components/clubs/admin-club-claims"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { MapPinned } from "lucide-react"

export const metadata: Metadata = {
  title: "Club Submissions Admin | RecruitNC",
  description: "Review, approve, and manage wrestling club submissions for the RecruitNC club locator.",
}

export default function AdminClubsPage() {
  return (
    <main className="admin-dark-page min-h-screen bg-[#060f1f] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin" className="text-sm font-bold text-[#D7B968] hover:text-white">
            ← Admin dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.32em] text-[#D7B968]">
                <MapPinned className="h-4 w-4" />
                Club locator admin
              </p>
              <h1 className={`mt-4 text-5xl leading-[0.95] text-white sm:text-7xl ${tocDisplayClass()}`}>
                Club submissions
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
                Review submitted wrestling clubs, add coordinates, and approve verified rooms into the public
                RecruitNC club map.
              </p>
            </div>
            <Link
              href="/clubs/submit"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/10"
            >
              Public submit form
            </Link>
          </div>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <h2 className={`text-3xl text-white ${tocDisplayClass()}`}>Club claims</h2>
        <p className="mt-2 max-w-3xl text-white/60">
          Coaches and owners asking for control of their listing. Approving grants them edit rights to that club&apos;s
          address, contact details, socials and programs — check the evidence first. They can never mark a club
          verified or rename it.
        </p>
        <div className="mt-5">
          <AdminClubClaims />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className={`text-3xl text-white ${tocDisplayClass()}`}>Club directory</h2>
        <p className="mt-2 max-w-3xl text-white/60">
          Every club on record. Add an address and the pin is placed for you — city and ZIP alone is enough for a
          town-level pin, a street address gives an exact one.
        </p>
        <div className="mt-5">
          <AdminClubDirectory />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className={`text-3xl text-white ${tocDisplayClass()}`}>Public submissions</h2>
        <p className="mt-2 max-w-3xl text-white/60">Clubs sent in through the public form, awaiting review.</p>
        <div className="mt-5">
          <AdminClubsManager />
        </div>
      </section>
    </main>
  )
}
