"use client"

import Image from "next/image"
import { ShoppingBag } from "lucide-react"
import { StoreNavLink } from "@/components/store-nav-link"

export function GearUpCarouselBanner() {
  return (
    <section className="relative w-full overflow-hidden" aria-label="NHSCA wrestling — shop official gear">
      <div className="relative w-full aspect-[21/9] min-h-[280px] sm:min-h-[340px] md:min-h-[400px] lg:min-h-[480px] max-h-[520px] lg:max-h-[600px]">
        <Image
          src="/images/nhsca-store-banner.png"
          alt="NHSCA wrestlers in competition"
          fill
          className="object-cover"
          sizes="100vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden />
        <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center justify-center text-center px-4 gap-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
            Gear Up for Nationals
          </h2>
          <StoreNavLink
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-[#002147] hover:bg-gray-100 transition-colors shadow-lg"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden />
            Shop gear
          </StoreNavLink>
        </div>
      </div>
    </section>
  )
}
