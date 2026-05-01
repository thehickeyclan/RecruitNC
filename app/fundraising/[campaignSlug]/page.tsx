import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import {
  fundraisingCampaignByPortalSlug,
  fundraisingCampaignPortalPath,
  FUNDRAISING_CAMPAIGNS,
} from "@/lib/fundraising/campaign-registry"

const NAVY = "#03154C"
const GOLD = "#CBAF5D"

export function generateStaticParams(): { campaignSlug: string }[] {
  const slugs = new Set<string>()
  for (const c of FUNDRAISING_CAMPAIGNS) {
    slugs.add(c.adminContextKey)
    slugs.add(c.stripeCampaignSlug)
  }
  return [...slugs].map((campaignSlug) => ({ campaignSlug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignSlug: string }>
}): Promise<Metadata> {
  const { campaignSlug } = await params
  const c = fundraisingCampaignByPortalSlug(campaignSlug)
  if (!c) return { title: "Campaign | NC United Fundraising" }
  return {
    title: `${c.campaignDisplayName} | Fundraising`,
    description: `Tax-deductible giving — ${c.campaignDisplayName}. NC United Wrestling 501(c)(3).`,
  }
}

export default async function FundraisingCampaignLandingPage({
  params,
}: {
  params: Promise<{ campaignSlug: string }>
}) {
  const { campaignSlug } = await params
  const c = fundraisingCampaignByPortalSlug(campaignSlug)
  if (!c) notFound()

  const canonicalPortal = fundraisingCampaignPortalPath(c)

  return (
    <div className="min-h-[70vh] bg-slate-100 pb-16">
      <header className="relative overflow-hidden px-4 pb-20 pt-12 sm:pb-24 sm:pt-16" style={{ backgroundColor: NAVY }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${GOLD} 0%, transparent 45%), radial-gradient(circle at 80% 80%, ${GOLD} 0%, transparent 40%)`,
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
            NC United Wrestling · Fundraising
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-[2rem] sm:leading-tight">
            {c.campaignDisplayName}
          </h1>
          <p className="mt-2 text-base font-medium text-white/75">{c.tabLabel}</p>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/88 sm:text-lg">
            Donations run through our nonprofit checkout — same secure flow as always. Use{" "}
            <strong className="font-semibold text-white">Give now</strong> to open the campaign donation page.
          </p>
        </div>
      </header>

      <div className="relative z-[1] mx-auto max-w-3xl px-4 sm:px-6" style={{ marginTop: "-4.5rem" }}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] sm:p-8">
          <HardLink
            href={c.publicPagePath}
            className="flex w-full flex-col items-center justify-center rounded-xl px-6 py-5 text-center transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03154C] focus-visible:ring-offset-2 sm:flex-row sm:justify-between sm:text-left"
            style={{ backgroundColor: NAVY }}
          >
            <span className="text-lg font-bold text-white">Give now</span>
            <span className="mt-2 text-sm text-white/85 sm:mt-0">
              Opens donation page <span className="tabular-nums opacity-90">({c.publicPagePath})</span>
            </span>
          </HardLink>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:justify-between">
            <HardLink href="/fundraising" className="font-medium underline-offset-4 hover:underline" style={{ color: NAVY }}>
              ← All fundraising campaigns
            </HardLink>
            {campaignSlug !== c.adminContextKey ? (
              <HardLink
                href={canonicalPortal}
                className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
              >
                Canonical link: {canonicalPortal}
              </HardLink>
            ) : null}
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-left">
          <strong className="font-semibold text-slate-800">NC United Wrestling</strong> · EIN{" "}
          <span className="tabular-nums">99-3757238</span> ·{" "}
          <a
            href="mailto:info@ncwrestlingunited.com"
            className="font-medium underline decoration-slate-300 underline-offset-4 hover:decoration-[#03154C]"
            style={{ color: NAVY }}
          >
            info@ncwrestlingunited.com
          </a>
        </p>
      </div>
    </div>
  )
}
