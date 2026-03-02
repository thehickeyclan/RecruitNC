"use client"

import type { ProductGridProduct } from "@/components/product-grid"

interface FeaturedProductsSectionProps {
  products: ProductGridProduct[]
}

export function FeaturedProductsSection({ products }: FeaturedProductsSectionProps) {
  const featured = products.filter((p) => p.is_featured).slice(0, 4)
  if (featured.length === 0) return null
  return (
    <section className="container mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold mb-4">Featured</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {featured.map((p) => (
          <div key={p.id} className="rounded-md border p-3 text-sm">
            <span className="font-medium">{p.name}</span>
            <span className="text-muted-foreground ml-1">${p.price}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
