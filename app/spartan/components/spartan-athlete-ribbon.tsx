"use client"

import { useSearchParams } from "next/navigation"

/** Subtle hero banner when ?athlete=NCU-LASTNAME-YY is present (shareable links). */
export function SpartanAthleteRibbon() {
  const searchParams = useSearchParams()
  if (!searchParams.get("athlete")?.trim()) return null

  return (
    <div className="mb-6 w-full max-w-xl rounded border border-[#C8A94A]/40 bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A94A]">
        You&apos;re here to support a teammate
      </p>
      <p className="mt-2 text-sm leading-snug text-[#ccc]">
        This link ties your gift to their fundraising. Complete <strong className="text-white">Race</strong> or{" "}
        <strong className="text-white">Donate</strong> below.
      </p>
    </div>
  )
}
