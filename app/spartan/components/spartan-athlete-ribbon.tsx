"use client"

import { useSearchParams } from "next/navigation"

/** Subtle hero banner when ?athlete=NCU-LASTNAME-YY is present (shareable links). */
export function SpartanAthleteRibbon() {
  const searchParams = useSearchParams()
  const raw = searchParams.get("athlete")?.trim()
  if (!raw) return null

  return (
    <div className="mb-6 w-full max-w-xl rounded border border-[#C8A94A]/40 bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A94A]">
        You&apos;re here to support
      </p>
      <p className="mt-1 font-[family-name:var(--font-barlow-spartan)] text-lg font-bold uppercase tracking-wide text-white">
        {raw}
      </p>
      <p className="mt-1 text-xs text-[#888]">
        This fundraising code is prefilled on the form so this gift counts toward their total.
      </p>
    </div>
  )
}
