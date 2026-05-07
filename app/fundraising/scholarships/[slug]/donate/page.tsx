import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ScholarshipFundCheckout } from "@/components/scholarships/scholarship-fund-checkout"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { HardLink } from "@/components/hard-link"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getScholarshipBySlug(slug)
  if (!row) return { title: "Donate | Scholarships" }
  return { title: `Donate · ${row.name}` }
}

export default async function ScholarshipDonatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  return (
    <div
      className="min-h-screen bg-[#061224] px-4 py-10 text-white sm:px-6 sm:py-14"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-lg">
        <HardLink href={`/fundraising/scholarships/${s.slug}`} className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          ← {s.name}
        </HardLink>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-10 text-2xl font-black uppercase text-white">
          Donate
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Your gift goes to <strong className="text-white/85">{s.name}</strong>. NC United Wrestling is a North Carolina
          501(c)(3); tax-deductible gifts are processed securely and your receipt is emailed after checkout.
        </p>
      </div>
      <ScholarshipFundCheckout scholarshipSlug={s.slug} scholarshipName={s.name} />
    </div>
  )
}
