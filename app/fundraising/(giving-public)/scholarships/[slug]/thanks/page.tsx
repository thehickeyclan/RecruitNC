import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { HardLink } from "@/components/hard-link"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getScholarshipBySlug(slug)
  if (!row) return { title: "Thank you | Scholarships" }
  return { title: `Thank you · ${row.name}` }
}

export default async function ScholarshipThanksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()

  return (
    <div
      className="flex min-h-screen flex-col bg-[#061224] text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="border-b border-white/10 bg-[#0B2545]/40 px-4 py-5">
        <div className="mx-auto flex max-w-lg justify-between gap-3">
          <HardLink href="/fundraising/scholarships" className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            ← Scholarships hub
          </HardLink>
          <HardLink
            href={`/fundraising/scholarships/${s.slug}`}
            className="text-xs font-semibold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-[#C8A94A] hover:underline"
          >
            {s.name}
          </HardLink>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-14 text-center sm:py-20">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United Scholarships
        </p>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-4 text-[clamp(1.75rem,5vw,2.35rem)] font-black uppercase leading-tight tracking-tight text-white">
          Thank you
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/78">
          Your gift is processing. Your receipt arrives by email shortly (check spam or promotions).
        </p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/55">
          EIN <span className="tabular-nums">99-3757238</span>
          {" · "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
      </main>
    </div>
  )
}
