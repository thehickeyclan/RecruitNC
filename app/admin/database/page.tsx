import type { Metadata } from "next"
import Link from "next/link"
import { PendingMigrations } from "@/components/admin/pending-migrations"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { Database } from "lucide-react"

export const metadata: Metadata = {
  title: "Database Setup | RecruitNC Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function AdminDatabasePage() {
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative border-b border-white/10 bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin" className="text-sm font-bold text-[#D7B968] hover:text-white">
            ← Admin
          </Link>
          <h1 className={`mt-4 flex items-center gap-3 text-4xl text-white sm:text-5xl ${tocDisplayClass()}`}>
            <Database className="h-8 w-8 text-[#D7B968]" />
            Database setup
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-white/70">
            Schema changes are run by hand in Supabase. This page checks the live database and shows which scripts are
            still outstanding, with the SQL ready to copy — so a missed one shows up here instead of as a broken page.
          </p>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <PendingMigrations />
      </section>
    </main>
  )
}
