import type { Metadata } from "next"
import Link from "next/link"
import { History } from "lucide-react"
import { AthleteChangeLog } from "@/components/admin/athlete-change-log"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"

export const metadata: Metadata = {
  title: "Athlete Changes | RecruitNC Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function AdminAthleteChangesPage() {
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin" className="text-sm font-bold text-[#D7B968] hover:text-white">
            ← Admin
          </Link>
          <h1 className={`mt-4 flex items-center gap-3 text-4xl text-white sm:text-5xl ${tocDisplayClass()}`}>
            <History className="h-8 w-8 text-[#D7B968]" />
            Athlete changes
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-white/70">
            Every edit, claim and parent link, newest first — who did it, what changed, and when. Anyone with an
            account can edit a profile, so this is the record of what they did.
          </p>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <AthleteChangeLog />
      </section>
    </main>
  )
}
