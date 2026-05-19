import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"

/** All partnership inquiries from this page go to NC United's main inbox. */
const NC_UNITED_INFO_EMAIL = "info@ncwrestlingunited.com"
const corporatePartnershipsMailto = `mailto:${NC_UNITED_INFO_EMAIL}?subject=${encodeURIComponent("Corporate partnership — NC United")}`

export const metadata: Metadata = {
  title: "Corporate partners | NC United Fundraising",
  description:
    "Corporate and foundation giving through NC United Wrestling (501(c)(3)) — nonprofit acknowledgements, recognition, and structured giving workflows.",
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
          Businesses and foundations can support NC United Wrestling with charitable contributions that may qualify for
          deductions or matching programs (subject to IRC rules and your counsel), alongside public recognition — structured through
          our 501(c)(3) nonprofit (EIN 99-3757238), not consumer crowdfunding.
        </p>
        <p className="mt-4 text-base leading-relaxed text-white">
          Tell us about your organization&apos;s goals — sponsorship, team challenges, matching gifts, or event presence —
          and we&apos;ll route you to the right NC United contact.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href={corporatePartnershipsMailto}
            className={`${displayFont("inline-flex min-h-12 flex-1 items-center justify-center rounded-sm bg-[#CC0000] px-6 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-[#a80000]")}`}
            aria-label={`Email ${NC_UNITED_INFO_EMAIL} about corporate partnerships`}
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
        <p className="mt-6 text-center text-sm text-white/85 sm:text-left">
          Sends to{" "}
          <a href={`mailto:${NC_UNITED_INFO_EMAIL}`} className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
            {NC_UNITED_INFO_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  )
}
