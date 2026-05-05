import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"

export const metadata: Metadata = {
  title: "Corporate partners | NC United Fundraising",
  description:
    "Corporate and foundation giving through NC United Wrestling — 501(c)(3) tax documentation, recognition tiers, and matching gifts.",
}

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export default function FundraisingCorporatePage() {
  return (
    <div
      className="min-h-[70vh] px-4 py-16 text-white sm:py-24"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif", backgroundColor: "#0B2545" }}
    >
      <div className="mx-auto max-w-2xl">
        <p className={`${displayFont("text-[10px] font-extrabold uppercase tracking-[0.28em] text-[#C8A94A]")}`}>
          Corporate partners
        </p>
        <h1 className={`${displayFont("mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl")}`}>
          Partner with NC United
        </h1>
        <p className="mt-6 text-base leading-relaxed text-white">
          Businesses and foundations can support NC United Wrestling with tax-deductible gifts, employer matching, and public
          recognition — structured through our 501(c)(3) nonprofit (EIN 99-3757238), not consumer crowdfunding.
        </p>
        <p className="mt-4 text-base leading-relaxed text-white">
          Tell us about your organization&apos;s goals — sponsorship, team challenges, matching gifts, or event presence —
          and we&apos;ll route you to the right NC United contact.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="mailto:info@ncwrestlingunited.com?subject=Corporate%20partnership%20%E2%80%94%20NC%20United"
            className={`${displayFont("inline-flex min-h-12 flex-1 items-center justify-center rounded-sm bg-[#CC0000] px-6 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-[#a80000]")}`}
          >
            Email partnerships
          </a>
          <HardLink
            href="/fundraising"
            className={`${displayFont("inline-flex min-h-12 flex-1 items-center justify-center rounded-sm border-2 border-white/25 px-6 text-sm font-extrabold uppercase tracking-wide text-white hover:border-[#C8A94A]/50")}`}
          >
            Back to hub
          </HardLink>
        </div>
      </div>
    </div>
  )
}
