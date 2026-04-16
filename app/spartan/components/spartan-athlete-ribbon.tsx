"use client"

import { useSearchParams } from "next/navigation"

/** Subtle hero banner when ?athlete=NCU-LASTNAME-YY is present (optional bookmark — still select at checkout). */
export function SpartanAthleteRibbon() {
  const searchParams = useSearchParams()
  if (!searchParams.get("athlete")?.trim()) return null

  return (
    <div className="mb-6 w-full max-w-xl rounded border border-[#C8A94A]/40 bg-black/50 px-4 py-3 text-center backdrop-blur-sm">
      <p className="font-[family-name:var(--font-barlow-spartan)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A94A]">
        You&apos;re here to support a teammate
      </p>
      <p className="mt-2 text-sm leading-snug text-[#ccc]">
        Tap <strong className="text-white">Racing</strong> or <strong className="text-white">Sponsor / Donate</strong>, then on
        the checkout form <strong className="text-white">search for them by name</strong> and select them before you
        pay—that&apos;s how your support credits them.
      </p>
    </div>
  )
}
