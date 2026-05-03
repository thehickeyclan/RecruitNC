import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { FundraisingGiveCheckout } from "./fundraising-give-checkout"

export const metadata: Metadata = {
  title: "Give | NC United Fundraising",
  description:
    "Support an NC wrestler with a named credit or donate to the NC United Training Fund. Tax-deductible gifts ($5 min) via secure checkout.",
}

export default async function FundraisingGivePage() {
  return (
    <div
      className="min-h-screen bg-[#061224] text-white"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="border-b border-white/10 bg-[#0B2545]/40 px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <HardLink
            href="/fundraising"
            className="text-sm font-semibold text-[#C8A94A] underline-offset-4 hover:underline"
          >
            ← Fundraising hub
          </HardLink>
          <HardLink
            href="/fundraising/athletes"
            className="text-xs font-semibold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-[#C8A94A] hover:underline"
          >
            Athlete pages
          </HardLink>
        </div>
      </div>

      <header className="px-4 pb-2 pt-10 text-center sm:pt-14">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United · Year-round giving
        </p>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-black uppercase tracking-tight text-white">
          Make a gift
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75">
          <strong className="text-white/88">Support an athlete</strong> with a named credit at checkout, or{" "}
          <strong className="text-white/88">donate to the NC United Training Fund</strong>. All gifts are tax-deductible ($5
          minimum). Share <span className="font-mono text-sm text-white/90">?athlete=NCU-…</span> on{" "}
          <HardLink href="/spartan" className="font-mono text-sm text-[#C8A94A] underline-offset-4 hover:underline">
            /spartan
          </HardLink>{" "}
          to pre-select a wrestler.
        </p>
      </header>

      <FundraisingGiveCheckout />

      <footer className="border-t border-white/10 px-4 py-10 text-center text-xs text-white/45">
        EIN <span className="tabular-nums">99-3757238</span> ·{" "}
        <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
          info@ncwrestlingunited.com
        </a>
        {" · "}
        <HardLink href="/spartan" className="text-[#C8A94A] underline-offset-4 hover:underline">
          Race registration &amp; Spartan drive
        </HardLink>
      </footer>
    </div>
  )
}
