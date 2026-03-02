"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import { getColorHex } from "@/lib/color-utils"

interface ProductCardProduct {
  id: string | number
  name: string
  price: number
  category?: string | null
  image_url?: string | null
  stock_quantity?: number
  rating?: number
  is_featured?: boolean
  variants?: Array<{ color?: string }>
  images?: Array<{ url: string; display_order?: number }>
}

interface ProductCardProps {
  product: ProductCardProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const variants = product.variants ?? []
  const images = product.images ?? []

  const uniqueColors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean))
  )
  const [currentColorIndex, setCurrentColorIndex] = useState(0)

  const getCurrentImage = () => {
    if (images.length > 0) {
      const sorted = [...images].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      )
      const imageIndex = Math.min(currentColorIndex, sorted.length - 1)
      return sorted[imageIndex]?.url ?? sorted[0]?.url
    }
    return product.image_url ?? "/placeholder.svg"
  }

  const handlePrevColor = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentColorIndex((prev) =>
      prev === 0 ? uniqueColors.length - 1 : prev - 1
    )
  }

  const handleNextColor = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentColorIndex((prev) =>
      prev === uniqueColors.length - 1 ? 0 : prev + 1
    )
  }

  const handleColorClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentColorIndex(index)
  }

  const productId = String(product.id)
  const productUrl = `/store/product/${productId}`
  const currentImage = getCurrentImage()
  const stockQty = product.stock_quantity ?? 0
  const rating = product.rating ?? 0

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg max-w-sm mx-auto w-full">
      <Link
        href={productUrl}
        className="relative block aspect-square overflow-hidden bg-secondary cursor-pointer p-4 md:p-6"
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt={product.name}
            fill
            className="object-contain transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={currentImage.includes("blob.vercel-storage.com")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            No image
          </div>
        )}

        {uniqueColors.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevColor}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Previous color"
            >
              <ChevronLeft className="w-4 h-4 text-gray-800" />
            </button>
            <button
              type="button"
              onClick={handleNextColor}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Next color"
            >
              <ChevronRight className="w-4 h-4 text-gray-800" />
            </button>
          </>
        )}

        {product.is_featured && (
          <Badge className="absolute top-2 right-2 bg-[#003366] text-white z-10">
            Featured
          </Badge>
        )}
        {stockQty <= 5 && stockQty > 0 && (
          <Badge className="absolute top-2 left-2 bg-[#CBAF5D] text-[#002147] z-10">
            Low Stock
          </Badge>
        )}
      </Link>

      <CardContent className="p-4">
        {product.category && (
          <Badge variant="outline" className="mb-2 text-xs">
            {product.category}
          </Badge>
        )}

        <Link
          href={productUrl}
          className="font-semibold text-lg mb-2 line-clamp-2 text-balance hover:text-[#003366] transition-colors block"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < Math.round(rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
              }`}
            />
          ))}
          <span className="text-sm text-muted-foreground ml-1">
            ({rating.toFixed(1)})
          </span>
        </div>

        {uniqueColors.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Colors:</span>
            <div className="flex gap-1">
              {uniqueColors.map((color, index) => {
                const hexColor = getColorHex(color)
                const isActive = index === currentColorIndex
                return (
                  <button
                    key={color}
                    type="button"
                    className={`w-5 h-5 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform shrink-0 ${
                      isActive
                        ? "border-[#003366] ring-2 ring-[#003366] ring-offset-1"
                        : "border-gray-300"
                    }`}
                    style={{ backgroundColor: hexColor }}
                    title={color}
                    onClick={(e) => handleColorClick(index, e)}
                  />
                )
              })}
            </div>
            {uniqueColors.length > 1 && (
              <span className="text-xs text-muted-foreground">
                +{uniqueColors.length}
              </span>
            )}
          </div>
        )}

        <p className="text-2xl font-bold text-[#003366]">
          ${Number(product.price).toFixed(2)}
        </p>

        <p className="text-sm text-muted-foreground mt-1">
          {stockQty > 10
            ? "In Stock"
            : stockQty > 0
              ? `Only ${stockQty} left`
              : "Out of Stock"}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          asChild
          className="w-full bg-[#003366] hover:bg-[#003366]/90 text-white"
        >
          <Link href={productUrl}>View Product</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
