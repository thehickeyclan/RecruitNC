import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { FUNDRAISING_CAMPAIGNS, fundraisingCampaignPortalPath } from "@/lib/fundraising/campaign-registry"

export const metadata: Metadata = {
  title: "Fundraising | NC United",
  description:
    "Support NC United athletes through official 501(c)(3) fundraising campaigns. Secure checkout via RecruitNC.",
}

const NAVY = "#03154C"
const GOLD = "#CBAF5D"

/**
 * Portal hub — additive only. Does not replace or alter `/spartan` checkout or Stripe metadata.
 */
export default function FundraisingPortalHomePage() {
  return (
    <div className="min-h-[70vh] bg-slate-100 pb-16">
      {/* Hero — NC United navy / gold */}
      <header className="relative overflow-hidden px-4 pb-20 pt-12 sm:pb-24 sm:pt-16" style={{ backgroundColor: NAVY }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${GOLD} 0%, transparent 45%), radial-gradient(circle at 80% 80%, ${GOLD} 0%, transparent 40%)`,
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
            NC United Wrestling · 501(c)(3)
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-[2.25rem] sm:leading-tight">
            Fundraising
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/88 sm:mx-0 sm:text-lg">
            Tax-deductible gifts through NC United. Pick an active campaign below — you&apos;ll use the same secure
            checkout as always (this page is only the front door).
          </p>
        </div>
      </header>

      {/* Raised card stack */}
      <div className="relative z-[1] mx-auto max-w-3xl px-4 sm:px-6" style={{ marginTop: "-4.5rem" }}>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25)] sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Active campaigns</h2>
          <ul className="mt-5 flex flex-col gap-3">
            {FUNDRAISING_CAMPAIGNS.map((c) => (
              <li key={c.adminContextKey}>
                <HardLink
                  href={fundraisingCampaignPortalPath(c)}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/90 to-white px-5 py-4 transition hover:border-[#03154C]/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03154C] focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <span className="block text-lg font-semibold leading-snug text-slate-900">{c.campaignDisplayName}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{c.tabLabel}</span>
                  </div>
                  <span
                    className="mt-3 inline-flex shrink-0 items-center text-sm font-semibold transition group-hover:gap-1 sm:mt-0"
                    style={{ color: NAVY }}
                  >
                    View campaign
                    <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
                      →
                    </span>
                    <span className="sr-only">{fundraisingCampaignPortalPath(c)}</span>
                  </span>
                </HardLink>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-left">
          <strong className="font-semibold text-slate-800">NC United Wrestling</strong> is a 501(c)(3) nonprofit.
          EIN <span className="tabular-nums">99-3757238</span>. Questions?{" "}
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
