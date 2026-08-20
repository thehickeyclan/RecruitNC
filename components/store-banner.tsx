"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { HardLink } from "@/components/hard-link";
import type { StoreCategoryOption } from "@/lib/store/store-categories";

interface StoreBannerProps {
  onShopAll: () => void;
  onShopCategory: (categoryId: string) => void;
  /** Derived from the loaded catalog by the store page — never a hardcoded list. */
  categories: StoreCategoryOption[];
  tocProductHref?: string;
}

export function StoreBanner({
  onShopAll,
  onShopCategory,
  categories,
  tocProductHref,
}: StoreBannerProps) {
  const preorderHref = tocProductHref ?? "/store-app?category=t-shirts";

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#050c1d]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(211,181,116,0.12),transparent_70%)]"
        aria-hidden
      />

      <div className="container relative mx-auto px-4 py-6 sm:py-8 lg:px-8 lg:py-10">
        <HardLink
          href={preorderHref}
          className="group relative mx-auto block max-w-7xl overflow-hidden rounded-xl border border-[#D3B574]/20 shadow-2xl shadow-black/50 transition hover:border-[#D3B574]/45"
        >
          <Image
            src="/images/store/toc-2026-tee-preorder-banner.png"
            alt="Official 2026 Tournament of Champions apparel — limited-edition tee available for preorder"
            width={1536}
            height={1024}
            priority
            className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.01]"
            sizes="(min-width: 1280px) 1216px, 100vw"
          />
          <span className="sr-only">
            Pre-order the official Tournament of Champions tee
          </span>
        </HardLink>

        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <HardLink
            href={preorderHref}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-1 rounded-lg bg-[#D3B574] px-6 py-2.5 text-sm font-black uppercase tracking-wide text-[#0A1628] transition-colors hover:bg-[#c4a665] sm:w-auto"
          >
            Pre-order the TOC tee
            <ChevronRight className="h-4 w-4" aria-hidden />
          </HardLink>
          <button
            type="button"
            onClick={onShopAll}
            className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
          >
            Shop all gear
          </button>
        </div>

        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.13em] text-white/55">
          Pre-order now · Pickup in Apex September 18–19
        </p>

        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onShopCategory(cat.id)}
              className="min-h-[40px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/75 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
