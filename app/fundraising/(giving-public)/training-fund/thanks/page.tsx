import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { NC_UNITED_CONTRIBUTIONS_TAX_DISCLAIMER } from "@/lib/fundraising/donor-facing-disclosures"

export const metadata: Metadata = {
  title: "Thank you | NC United Training Fund",
  description: "Your NC United Training Fund gift is processing — acknowledgement follows checkout.",
}

export default function FundraisingTrainingFundThanksPage() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#061224] text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="border-b border-white/10 bg-[#0B2545]/40 px-4 py-5">
        <div className="mx-auto flex max-w-lg justify-between gap-3">
          <HardLink
            href="/fundraising"
            className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            ← Fundraising hub
          </HardLink>
          <HardLink
            href="/fundraising/training-fund"
            className="text-xs font-semibold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-[#C8A94A] hover:underline"
          >
            Training fund
          </HardLink>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-14 text-center sm:py-20">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United Training Fund
        </p>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-4 text-[clamp(1.75rem,5vw,2.35rem)] font-black uppercase leading-tight tracking-tight text-white">
          Thank you
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/78">
          Thank you — your NC United Training Fund gift is processing. Watch for acknowledgement email shortly (check spam or
          promotions).
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-white/50">{NC_UNITED_CONTRIBUTIONS_TAX_DISCLAIMER}</p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-white/55">
          EIN <span className="tabular-nums">99-3757238</span>
          {" · "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
            info@ncwrestlingunited.com
          </a>
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <HardLink
            href="/fundraising/training-fund"
            className="font-[family-name:var(--font-fundraising-display)] inline-flex min-h-[48px] items-center justify-center border border-[#C8A94A]/50 bg-[#0B2545]/40 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white hover:border-[#C8A94A] hover:bg-[#0B2545]/70"
          >
            Training fund page
          </HardLink>
          <HardLink
            href="/fundraising/athletes"
            className="font-[family-name:var(--font-fundraising-display)] inline-flex min-h-[48px] items-center justify-center border border-white/25 px-6 text-xs font-extrabold uppercase tracking-[0.12em] text-white/90 hover:border-white/50"
          >
            Support an athlete
          </HardLink>
        </div>
      </main>
    </div>
  )
}
