"use client"

import Link from "next/link"

interface NHSCADivisionStatsProps {
  division: "Freshman" | "Sophomore" | "Junior" | "Senior"
}

/**
 * Placeholder for division-specific NHSCA stats.
 * Phase 2 can wire this to wrestling_nhsca_results (e.g. All-American count per division).
 */
export function NHSCADivisionStats({ division }: NHSCADivisionStatsProps) {
  return (
    <div className="bg-[#002147]/5 border border-[#002147]/20 rounded-lg p-4">
      <h4 className="font-semibold text-[#002147] mb-2">{division} division</h4>
      <p className="text-sm text-[#002147]/80 mb-3">
        Stats for this division will appear when the 2025 Results and Archive pages are migrated.
      </p>
      <Link
        href="/nhsca/2025"
        className="text-sm font-medium text-[#002147] underline hover:no-underline"
      >
        View 2025 Results →
      </Link>
    </div>
  )
}
