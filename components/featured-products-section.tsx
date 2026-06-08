"use client"

import { StoreLink } from "@/components/store-link"
import { StoreCatalogImage, STORE_CATALOG_FRAME_CLASS } from "@/components/store-catalog-image"
import type { ProductGridProduct } from "@/components/product-grid"
import { pickStoreFeaturedProducts } from "@/lib/store/featured-products"

interface FeaturedProductsSectionProps {
  products: ProductGridProduct[]
  onViewAll?: () => void
}

export function FeaturedProductsSection({ products, onViewAll }: FeaturedProductsSectionProps) {
  const featured = pickStoreFeaturedProducts(products)
  if (featured.length === 0) return null

  return (
    <section className="border-b border-white/10 bg-[#0A1628]">
      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D3B574] sm:text-xs">
              Shop the drop
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              Featured
            </h2>
          </div>
          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="shrink-0 text-sm font-semibold text-[#D3B574] transition-colors hover:text-[#e5cb8a]"
            >
              View all &rarr;
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((p) => {
            const image = p.images?.[0]?.url ?? p.image_url ?? "/placeholder.svg"
            return (
              <StoreLink
                key={String(p.id)}
                href={`/store-app/product/${p.id}`}
                className={`group relative block ${STORE_CATALOG_FRAME_CLASS}`}
              >
                <StoreCatalogImage
                  src={image}
                  alt={p.name}
                  product={p}
                  hoverZoom
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/95 via-[#0A1628]/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-[#D3B574]">${Number(p.price).toFixed(2)}</p>
                </div>
              </StoreLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
