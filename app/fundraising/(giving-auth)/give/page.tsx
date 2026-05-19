import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { FundraisingGiveCheckout } from "./fundraising-give-checkout"

export const metadata: Metadata = {
  title: "Give | NC United Fundraising",
  description:
    "Give to NC United Wrestling with donor preference for a wrestler or the Training Fund ($5+) — secure nonprofit checkout.",
}

export default async function FundraisingGivePage({
  searchParams,
}: {
  searchParams?: Promise<{ cancelled?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const cancelled = sp.cancelled === "1"
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

      {cancelled ? (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <p className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            Checkout was cancelled — nothing was charged. You can try again whenever you&apos;re ready.
          </p>
        </div>
      ) : null}

      <header className="px-4 pb-2 pt-10 text-center sm:pt-14">
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.28em] text-[#CC0000]">
          NC United · Year-round giving
        </p>
        <h1 className="font-[family-name:var(--font-fundraising-display)] mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-black uppercase tracking-tight text-white">
          Make a gift
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75">
          <strong className="text-white/88">Support a wrestler</strong> — gift to NC United with donor preference at checkout —
          or <strong className="text-white/88">give to the NC United Training Fund</strong>. Minimum{" "}
          <span className="tabular-nums">$5</span>. Acknowledgement email follows checkout; consult your tax advisor about deductions.
        </p>
      </header>

      <FundraisingGiveCheckout />

      <footer className="border-t border-white/10 px-4 py-10 text-center text-xs text-white/45">
        EIN <span className="tabular-nums">99-3757238</span> ·{" "}
        <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
          info@ncwrestlingunited.com
        </a>
        {" · "}
        <HardLink href="/fundraising" className="text-[#C8A94A] underline-offset-4 hover:underline">
          Giving hub
        </HardLink>
      </footer>
    </div>
  )
}
