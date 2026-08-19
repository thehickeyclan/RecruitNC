"use client"

import { StoreLink } from "@/components/store-link"
import { StoreCatalogImage, STORE_CATALOG_FRAME_CLASS } from "@/components/store-catalog-image"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface RelatedProduct {
  id: string | number
  name: string
  price: number
  image: string
  category?: string | null
  rating?: number
  sizes?: string[]
  stock_quantity?: number
  badge?: string
}

interface RelatedProductsProps {
  products: RelatedProduct[]
  storeTheme?: boolean
}

export function RelatedProducts({ products, storeTheme = false }: RelatedProductsProps) {
  const renderStars = (rating: number) => {
    const r = Math.min(5, Math.max(0, Math.round(rating)))
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-3 h-3",
          i < r ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
      />
    ))
  }

  if (!products?.length) return null

  return (
    <section className={cn("mt-12 border-t pt-8", storeTheme && "border-white/10")}>
      <h2 className={cn("text-2xl font-bold mb-6", storeTheme ? "text-white" : "text-[#003366]")}>
        You May Also Like
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const productId = String(product.id)
          const productUrl = `/store-app/product/${productId}`

          return (
            <div
              key={productId}
              className={cn(
                "group rounded-lg overflow-hidden transition-shadow",
                storeTheme
                  ? "border border-white/10 hover:shadow-lg hover:shadow-black/30"
                  : "border hover:shadow-lg",
              )}
            >
              <StoreLink
                href={productUrl}
                className={cn(
                  "relative block",
                  storeTheme ? STORE_CATALOG_FRAME_CLASS : "aspect-square bg-secondary",
                )}
              >
                {product.image ? (
                  <StoreCatalogImage
                    src={product.image}
                    alt={product.name}
                    singlet={/singlet/i.test(product.name)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
                    No image
                  </div>
                )}
                {product.badge && (
                  <Badge className="absolute top-2 right-2 bg-[#003366] text-white">
                    {product.badge}
                  </Badge>
                )}
              </StoreLink>

              <div className="p-4 space-y-3">
                <div>
                  <StoreLink href={productUrl}>
                    <h3
                      className={cn(
                        "font-semibold text-lg mb-1 transition-colors line-clamp-2",
                        storeTheme ? "text-white hover:text-[#D3B574]" : "hover:text-[#003366]",
                      )}
                    >
                      {product.name}
                    </h3>
                  </StoreLink>
                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(product.rating ?? 0)}
                  </div>
                  <p className={cn("text-xl font-bold", storeTheme ? "text-white" : "text-foreground")}>
                    ${Number(product.price).toFixed(2)}
                  </p>
                </div>

                <Button asChild className="w-full bg-[#003366] hover:bg-[#003366]/90 text-white">
                  <StoreLink href={productUrl}>Choose Options</StoreLink>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
