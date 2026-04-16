"use client"

import { useMemo, useState } from "react"
import { HardLink } from "@/components/hard-link"

const QUICK_AMOUNTS = [25, 50, 100, 250] as const

function parseDollars(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(n) || n < 5) return null
  return Math.round(n * 100) / 100
}

/**
 * “Not racing” entry: same checkout as hero. Form: sponsor one wrestler or NC United general.
 */
export function SpartanDonateMissionCard() {
  const [dollars, setDollars] = useState("50")

  const chipHref = useMemo(() => {
    const n = parseDollars(dollars)
    const d = n ?? 50
    return `/spartan?mission=1&chip=${encodeURIComponent(String(d))}#spartan-checkout`
  }, [dollars])

  return (
    <article
      id="sponsor"
      className="group flex h-full flex-col border-2 border-[#C8A94A] bg-[#141414] p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_48px_rgba(200,169,74,0.12)]"
    >
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A94A]">
        Not racing
      </p>
      <h3 className="mt-2 font-[family-name:var(--font-barlow-spartan)] text-[22px] font-extrabold uppercase leading-tight tracking-tight text-white md:text-[26px]">
        Sponsor a wrestler or give to NC United
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#bbb]">
        Tax-deductible to NC United (501(c)(3)). On the next screen, choose{" "}
        <strong className="text-white">one wrestler</strong> to sponsor or <strong className="text-white">NC United</strong>{" "}
        for the general fund — same checkout.
      </p>
      <p className="mt-3 font-[family-name:var(--font-barlow-spartan)] text-[11px] uppercase tracking-[0.14em] text-[#666]">
        Any amount from $5 — every gift counts
      </p>

      <div className="my-5 h-px w-full bg-[#333]" aria-hidden />

      <label
        htmlFor="donate-mission-amount"
        className="font-[family-name:var(--font-barlow-spartan)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#888]"
      >
        Your amount
      </label>
      <div className="mt-2 flex min-h-[48px] items-stretch overflow-hidden rounded border border-[#444] bg-white">
        <span className="flex items-center bg-[#f5f5f5] px-3 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold text-[#C8A94A]">
          $
        </span>
        <input
          id="donate-mission-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={dollars}
          onChange={(e) => setDollars(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-white px-3 font-[family-name:var(--font-barlow-spartan)] text-xl font-black tabular-nums text-[#0A0A0A] outline-none focus:ring-2 focus:ring-inset focus:ring-[#C8A94A]"
          aria-describedby="donate-mission-hint"
        />
      </div>
      <p id="donate-mission-hint" className="mt-2 text-xs text-[#888]">
        Fully tax-deductible · 501(c)(3) nonprofit
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDollars(String(d))}
            className="inline-flex min-h-[36px] min-w-[3.5rem] items-center justify-center border border-[#5a4d22] bg-[#1a170d] px-2 font-[family-name:var(--font-barlow-spartan)] text-xs font-bold uppercase tracking-wide text-[#C8A94A] transition-colors hover:border-[#C8A94A]"
          >
            ${d}
          </button>
        ))}
      </div>

      <HardLink
        href={chipHref}
        className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center border border-[#3a3a3a] bg-[#252525] px-2 font-[family-name:var(--font-barlow-spartan)] text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#C8A94A] hover:bg-[#2f2f2f] active:opacity-90"
      >
        Continue to donate
      </HardLink>

      <div
        id="athletes"
        className="scroll-mt-24 mt-6 border-t border-[#333] pt-5 text-left text-[11px] leading-relaxed text-[#888]"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666]">How credit works</p>
        <p className="mt-2 text-[#aaa]">
          Everyone uses this same page. At checkout, donors <strong className="text-[#ccc]">search and select the wrestler</strong>{" "}
          (or NC United / manual name)—that&apos;s what ties the gift. Optional:{" "}
          <HardLink href="/spartan?athlete=NCU-HICKEY-29" className="text-[#C8A94A] underline-offset-2 hover:underline">
            /spartan?athlete=…
          </HardLink>{" "}
          can pre-fill the fundraising field; you still confirm in search.
        </p>
      </div>
    </article>
  )
}
