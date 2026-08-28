"use client"

import { useEffect, useState } from "react"
import { tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_GOFAN_TICKETS_URL, TOC_TICKET_LIMITED_LINE, TOC_TICKET_SALE_TIMING } from "@/lib/toc/constants"
import { msUntilTocTicketSale, tocTicketsOnSale } from "@/lib/toc/ticket-sale"

/**
 * Shows the on-sale announcement until Friday Aug 28, 2026 8:00 AM ET (public sale; athlete families get a private presale link first), then becomes the
 * GoFan "Buy Tickets" button — no launch-morning deploy. The TOC page is force-dynamic,
 * so fresh loads flip server-side at the exact moment; the timer below flips the page for
 * anyone already sitting on it when the clock strikes.
 */
export function TocTicketCta({ variant }: { variant: "hero" | "card" }) {
  // Server and client both evaluate live (force-dynamic), so hydration agrees except in
  // the sub-second window around the flip; the mount effect corrects that instantly.
  const [onSale, setOnSale] = useState(() => tocTicketsOnSale())

  useEffect(() => {
    if (tocTicketsOnSale()) {
      setOnSale(true)
      return
    }
    // Re-check hourly (clock drift, sleep/resume) and at the exact boundary. setTimeout
    // overflows past ~24.8 days, so cap each wait — chained via effect re-run on state,
    // or simply re-arm here.
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      const wait = Math.min(msUntilTocTicketSale(), 60 * 60 * 1000)
      timer = setTimeout(() => {
        if (tocTicketsOnSale()) setOnSale(true)
        else arm()
      }, Math.max(wait, 1_000))
    }
    arm()
    return () => clearTimeout(timer)
  }, [])

  if (onSale) {
    return (
      <a
        href={TOC_GOFAN_TICKETS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={variant === "hero" ? tocMobileCtaClass("primary") : `${tocMobileCtaClass("primary")} mt-4 text-sm`}
      >
        {variant === "hero" ? "Buy Tickets" : "Buy tickets on GoFan"}
      </a>
    )
  }

  return variant === "hero" ? (
    <div className="inline-block rounded-sm border border-white/25 bg-white/10 px-4 py-2.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <span aria-hidden>🎟</span>
        Tickets go on sale {TOC_TICKET_SALE_TIMING}
      </p>
      <p className="mt-0.5 text-xs text-white/70">{TOC_TICKET_LIMITED_LINE}</p>
    </div>
  ) : (
    <div className="mt-4 rounded-sm border border-white/25 bg-white/10 px-4 py-3">
      <p className="text-sm font-semibold text-white">🎟 Tickets go on sale {TOC_TICKET_SALE_TIMING}</p>
      <p className="mt-0.5 text-xs text-white/70">{TOC_TICKET_LIMITED_LINE}</p>
    </div>
  )
}
