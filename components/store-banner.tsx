"use client"

import Image from "next/image"
import { ChevronRight, Trophy } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { NC_UNITED_FIRST_IN_FLIGHT_PRODUCT_ID } from "@/lib/nc-united-2026-store-gear"

interface StoreBannerProps {
  onShopAll: () => void
  onShopCategory: (categoryId: string) => void
}

const categories = ["Singlets", "T-Shirts", "Sweatshirts", "Headwear", "Accessories"]

const FIRST_IN_FLIGHT_HREF = `/store-app/product/${NC_UNITED_FIRST_IN_FLIGHT_PRODUCT_ID}`

export function StoreBanner({ onShopAll, onShopCategory }: StoreBannerProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#050c1d]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(211,181,116,0.12),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_100%,rgba(15,28,46,0.9),transparent)]"
        aria-hidden
      />

      {/* Mobile-first: stacked story → product → CTA */}
      <div className="container relative mx-auto px-4 py-10 sm:py-12 lg:hidden">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-3 flex items-center gap-2 text-[#D3B574]">
            <Trophy className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] sm:text-xs">
              Limited championship drop
            </p>
          </div>

          <h1 className="text-balance text-3xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
            First in Flight
          </h1>

          <p className="mt-3 text-balance text-xs font-semibold uppercase leading-snug tracking-wide text-[#D3B574] sm:text-sm">
            Voted NC United&apos;s greatest singlet of all time
          </p>

          <div className="my-2 h-px w-12 bg-[#D3B574]/60" aria-hidden />

          <p className="text-balance text-sm leading-relaxed text-white/75">
            The singlet that started it all — worn by NC United&apos;s inaugural national team and voted the GOAT by
            the NC wrestling community.
          </p>

          <div className="relative my-6 w-full max-w-[220px] sm:max-w-[260px]">
            <div
              className="absolute -inset-4 rounded-full bg-[#D3B574]/10 blur-2xl"
              aria-hidden
            />
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
              <Image
                src="/images/store/first-in-flight-singlet-navy.png"
                alt="NC United First In Flight singlet"
                fill
                priority
                className="object-contain object-center"
                sizes="(max-width: 640px) 60vw, 260px"
              />
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D3B574]">
            While supplies last
          </p>
          <p className="mt-1 text-balance text-sm text-white/65">
            Own a piece of North Carolina wrestling history.
          </p>

          <HardLink
            href={FIRST_IN_FLIGHT_HREF}
            className="mt-6 inline-flex min-h-[48px] w-full max-w-xs items-center justify-center gap-1 rounded-lg bg-[#D3B574] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0A1628] transition-colors hover:bg-[#c4a665]"
          >
            Shop First in Flight
            <ChevronRight className="h-4 w-4" aria-hidden />
          </HardLink>

          <button
            type="button"
            onClick={onShopAll}
            className="mt-3 min-h-[44px] px-4 text-sm font-medium text-white/55 underline-offset-4 hover:text-white/80 hover:underline"
          >
            Browse all gear
          </button>
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onShopCategory(cat)}
              className="min-h-[40px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/75 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: wide art-directed banner */}
      <div className="relative mx-auto hidden max-w-7xl px-4 py-10 lg:block lg:px-8 lg:py-12">
        <HardLink
          href={FIRST_IN_FLIGHT_HREF}
          className="group relative block overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50 transition-opacity hover:opacity-[0.98]"
        >
          <Image
            src="/images/store/first-in-flight-hero-banner-wide.png"
            alt="First in Flight — NC United's greatest singlet. Limited championship drop."
            width={1536}
            height={1024}
            priority
            className="h-auto w-full"
            sizes="(min-width: 1024px) 1280px, 100vw"
          />
          <span className="sr-only">Shop First in Flight singlet</span>
        </HardLink>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onShopAll}
            className="min-h-[44px] rounded-lg bg-[#D3B574] px-6 py-2.5 text-sm font-semibold text-[#0A1628] transition-colors hover:bg-[#c4a665]"
          >
            Shop all
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onShopCategory(cat)}
              className="min-h-[44px] rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
