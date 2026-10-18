"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

/**
 * The floating launcher on the families' recruiting pages: Scout, not Data Dawg (Matt, 18 Oct
 * 2026). Data Dawg stays the assistant everywhere else, for results and statistics. It opens the
 * Scout page, which a family without the Command Center sees as what Scout does and how to get it.
 */
export function ScoutLauncher() {
  return (
    <div className="fixed bottom-20 right-4 z-50 flex items-center gap-3 print:hidden sm:bottom-4">
      <Link
        href="/my-recruiting/scout"
        aria-label="Ask Scout, your recruiting assistant"
        className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#D3B574]/50 bg-[#0A1628] shadow-lg shadow-[#D3B574]/20 transition hover:border-[#D3B574]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/scout-avatar.webp" alt="" className="h-full w-full object-cover object-top" />
      </Link>
      <Link
        href="/my-recruiting/scout"
        className="hidden rounded-full border border-[#1e3a5f] bg-[#0F1E32] px-4 py-2 text-sm font-semibold text-[#D3B574] shadow-lg transition hover:bg-[#1e3a5f] hover:text-white md:inline-flex md:items-center md:gap-2"
      >
        <Sparkles className="h-4 w-4" aria-hidden /> Ask Scout
      </Link>
    </div>
  )
}
