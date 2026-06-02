"use client"

import { StoreLink } from "@/components/store-link"
import { StoreCatalogImage, STORE_CATALOG_FRAME_CLASS } from "@/components/store-catalog-image"
import type { ProductGridProduct } from "@/components/product-grid"

interface FeaturedProductsSectionProps {
  products: ProductGridProduct[]
}

export function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  const featured = products.filter((p) => p.is_featured).slice(0, 4)
  if (featured.length === 0) return null

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-white tracking-tight uppercase">Featured</h2>
        <span className="text-sm text-[#D3B574] font-medium">View All &rarr;</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/90 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-sm font-semibold text-white line-clamp-1">{p.name}</p>
                <p className="text-sm font-bold text-[#D3B574]">${Number(p.price).toFixed(2)}</p>
              </div>
            </StoreLink>
          )
        })}
      </div>
    </section>
  )
}
