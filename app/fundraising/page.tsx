import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { FUNDRAISING_CAMPAIGNS } from "@/lib/fundraising/campaign-registry"

export const metadata: Metadata = {
  title: "Fundraising | NC United",
  description:
    "Support NC United athletes through official 501(c)(3) fundraising campaigns. Secure checkout via RecruitNC.",
}

/**
 * Portal hub — additive only. Does not replace or alter `/spartan` checkout or Stripe metadata.
 * Campaign CTAs use each row's `publicPagePath` from the registry (today `/spartan`).
 */
export default function FundraisingPortalHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/80">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">NC United Wrestling</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Fundraising</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Give through our nonprofit infrastructure — tax-deductible donations with designated athlete credit where
          applicable. Below are active campaign pages (same flows as always; this hub only collects links).
        </p>

        <ul className="mt-10 flex flex-col gap-4">
          {FUNDRAISING_CAMPAIGNS.map((c) => (
            <li key={c.adminContextKey}>
              <HardLink
                href={c.publicPagePath}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366] focus-visible:ring-offset-2"
              >
                <span className="text-lg font-semibold text-slate-900">{c.campaignDisplayName}</span>
                <span className="mt-1 text-sm text-slate-600">{c.tabLabel}</span>
                <span className="mt-3 text-sm font-medium text-[#003366]">
                  Open campaign → <span className="sr-only">{c.publicPagePath}</span>
                </span>
              </HardLink>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-xs leading-relaxed text-slate-500">
          NC United Wrestling is a 501(c)(3) nonprofit (EIN 99-3757238). Questions:{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="underline underline-offset-2 hover:text-slate-700">
            info@ncwrestlingunited.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
