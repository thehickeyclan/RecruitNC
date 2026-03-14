"use client"

import Image from "next/image"
import { ShoppingBag } from "lucide-react"
import { StoreNavLink } from "@/components/store-nav-link"

export function GearUpCarouselBanner() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative w-full aspect-[21/9] min-h-[200px] sm:min-h-[240px] md:min-h-[280px] max-h-[420px]">
        <Image
          src="/hero-banner-nchsaa-2026-arena.png"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-[#002147]/70" aria-hidden />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 md:mb-3">
            Gear Up for States with Official North Carolina Wrestling Gear
          </h2>
          <p className="text-sm sm:text-base text-white/95 max-w-2xl mb-4 md:mb-6">
            All orders can be shipped or picked up during the NCHSAA State Tournament — Greensboro, Suite 109.
          </p>
          <StoreNavLink
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#B8982E] px-6 py-3 text-base font-semibold text-[#002147] hover:bg-[#D4BC6A] transition-colors shadow-lg"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            Shop gear
          </StoreNavLink>
        </div>
      </div>
    </section>
  )
}
