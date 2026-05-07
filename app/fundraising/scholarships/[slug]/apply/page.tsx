import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ScholarshipApplicationForm } from "@/components/scholarships/scholarship-application-form"
import {
  scholarshipApplicationsAreOpen,
} from "@/lib/scholarships/applications-open"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { HardLink } from "@/components/hard-link"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getScholarshipBySlug(slug)
  if (!row) return { title: "Apply | Scholarships" }
  return { title: `Apply · ${row.name}` }
}

export default async function ScholarshipApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  if (!scholarshipApplicationsAreOpen(s)) {
    return (
      <div
        className="min-h-screen bg-[#061224] px-4 py-14 text-white sm:px-6"
        style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
      >
        <div className="mx-auto max-w-lg">
          <HardLink href={`/fundraising/scholarships/${s.slug}`} className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            ← Back
          </HardLink>
          <h1 className="font-[family-name:var(--font-fundraising-display)] mt-10 text-2xl font-black uppercase text-white">
            Applications aren&apos;t open
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            Check the scholarship page for dates and status. Contact{" "}
            <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
              info@ncwrestlingunited.com
            </a>{" "}
            if you need help.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-10 text-white sm:px-6 sm:py-14"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-2xl">
        <HardLink href={`/fundraising/scholarships/${s.slug}`} className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          ← {s.name}
        </HardLink>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-10 text-[clamp(1.5rem,4vw,2.25rem)] font-black uppercase leading-tight text-white">
          Application
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Complete every required block. The written statement must stay within <strong className="text-white/85">300–500 words</strong>.
        </p>
        <div className="mt-10">
          <ScholarshipApplicationForm slug={s.slug} scholarshipName={s.name} />
        </div>
      </div>
    </div>
  )
}
