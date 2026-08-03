import type { Metadata } from "next"
import Link from "next/link"
import { AdminClubsManager } from "@/components/clubs/admin-clubs-manager"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { MapPinned } from "lucide-react"

export const metadata: Metadata = {
  title: "Club Submissions Admin | RecruitNC",
  description: "Review, approve, and manage wrestling club submissions for the RecruitNC club locator.",
}

export default function AdminClubsPage() {
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
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

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminClubsManager />
      </section>
    </main>
  )
}
