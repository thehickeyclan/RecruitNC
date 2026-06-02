"use client"

import { useState } from "react"
import { StoreLink } from "@/components/store-link"
import { StoreCatalogImage, STORE_CATALOG_FRAME_CLASS } from "@/components/store-catalog-image"
import { Star, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCartStore, getMaxQuantityForItem } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"

function toCartProductId(id: string | number): number {
  if (typeof id === "number" && Number.isInteger(id)) return id
  const s = String(id)
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) || 0
}

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
  const [addedProducts, setAddedProducts] = useState<Record<string, boolean>>({})
  const { addItem } = useCartStore()
  const { toast } = useToast()

  const handleAddToCart = (e: React.MouseEvent, product: RelatedProduct) => {
    e.preventDefault()
    e.stopPropagation()
    const productId = String(product.id)
    const defaultSize = product.sizes?.[0] ?? "M"
    const defaultColor =
      product.category?.toLowerCase() === "headwear"
        ? "Navy Blue"
        : product.name.toLowerCase().includes("red")
          ? "Red"
          : "Navy Blue"

    const sku = `NC-${String(product.id).slice(0, 8)}`
    const maxQty = getMaxQuantityForItem({ sku, name: product.name })

    addItem({
      id: toCartProductId(product.id),
      name: product.name,
      price: product.price,
      image: product.image || "/placeholder.svg",
      variant: { color: defaultColor, size: defaultSize },
      sku,
      quantity: Math.min(1, maxQty),
      stock: (product.stock_quantity ?? 0) > 10 ? "in-stock" : "low-stock",
    })

    setAddedProducts((prev) => ({ ...prev, [productId]: true }))
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })
    setTimeout(() => {
      setAddedProducts((prev) => ({ ...prev, [productId]: false }))
    }, 2000)
  }

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
          const isAdded = addedProducts[productId]

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

                <Button
                  onClick={(e) => handleAddToCart(e, product)}
                  disabled={isAdded}
                  className="w-full bg-[#003366] hover:bg-[#003366]/90 text-white"
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Added!
                    </>
                  ) : (
                    "Add to Cart"
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
