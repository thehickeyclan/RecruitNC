"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { HardLink } from "@/components/hard-link"

const STORAGE_KEY = "recruitnc_hide_fundraising_playbook_home_banner"

/** Fundraising hub navy / gold — distinct from NHSCA banner */
const BG = "#061224"
const GOLD = "#C8A94A"

export function FundraisingPlaybookHomeBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
        setDismissed(true)
      }
    } catch {
      /* storage blocked */
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null

  return (
    <div
      className="relative z-30 overflow-hidden border-b shadow-md"
      style={{ borderColor: `${GOLD}66`, backgroundColor: BG }}
      role="region"
      aria-label="NC United fundraising playbook"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/20" aria-hidden />
      <div className="relative container mx-auto flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:gap-6 md:py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-snug text-white md:text-lg">
            $22K+ in 16 days for NC United summer training —{" "}
            <span className="text-white/95">your family can too.</span>
          </h2>
          <p className="mt-1.5 text-sm leading-snug text-white/80 md:text-[15px]">
            Access the <strong className="font-semibold text-white/90">RecruitNC Fundraising Playbook</strong> — charitable gifts through NC United
            Wrestling&apos;s nonprofit checkout for the NC United Training Fund (with wrestlers documented at checkout), employer matching pathways, business donors,
            and step-by-step outreach. Acknowledgements follow IRC standards; deductions depend on each donor&apos;s facts — ask your advisor. Sign in to read it
            and request gift-page access.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <HardLink
            href="/fundraising/playbook/members"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold shadow-md transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ backgroundColor: GOLD, color: "#061224" }}
          >
            Open fundraising playbook
            <span className="ml-1" aria-hidden>
              →
            </span>
          </HardLink>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label="Dismiss fundraising playbook banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
