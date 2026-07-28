import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ScholarshipFundCheckout } from "@/components/scholarships/scholarship-fund-checkout"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { HardLink } from "@/components/hard-link"

const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.ncwrestlingunited.com"
const CADEN_PERRY_SHARE_IMAGE = {
  url: `${base}/scholarships/caden-perry/warrior-scholarship-share-card-wide.png`,
  width: 1448,
  height: 1086,
  alt: "The Caden Perry Warrior Scholarship — $1,000 wrestling-support award",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const row = await getScholarshipBySlug(slug)
  if (!row) return { title: "Donate | Scholarships" }
  const title = `Donate · ${row.name}`
  const description =
    row.slug === "caden-perry"
      ? "Support The Caden Perry Warrior Scholarship — one North Carolina wrestler will receive $1,000 in wrestling support."
      : `Support ${row.name} through NC United Wrestling.`
  const isCaden = row.slug === "caden-perry"
  return {
    metadataBase: new URL(base),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/fundraising/scholarships/${row.slug}/donate`,
      siteName: "NC United / RecruitNC",
      locale: "en_US",
      type: "website",
      images: isCaden
        ? [CADEN_PERRY_SHARE_IMAGE]
        : row.hero_image_url
          ? [{ url: row.hero_image_url, alt: row.name }]
          : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: isCaden ? [CADEN_PERRY_SHARE_IMAGE.url] : row.hero_image_url ? [row.hero_image_url] : undefined,
    },
    alternates: {
      canonical: `${base}/fundraising/scholarships/${row.slug}/donate`,
    },
  }
}

export default async function ScholarshipDonatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getScholarshipBySlug(slug)
  if (!s) notFound()
  const isCaden = s.slug === "caden-perry"

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
        {isCaden ? (
          <p className="mt-4 rounded-xl border border-[#C8A94A]/30 bg-[#C8A94A]/10 p-4 text-base font-semibold leading-relaxed text-[#f5e6b8]">
            One North Carolina wrestler will receive $1,000 in wrestling support, applied directly to documented training
            and competition expenses.
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          Your gift supports <strong className="text-white/85">{s.name}</strong> as a charitable contribution to NC United
          Wrestling — North Carolina 501(c)(3) — administered under NC United policy. Checkout is secure; acknowledgement email follows
          payment. Ask your tax advisor whether your gift qualifies as a charitable deduction for you.
        </p>
      </div>
      <ScholarshipFundCheckout scholarshipSlug={s.slug} scholarshipName={s.name} />
    </div>
  )
}
