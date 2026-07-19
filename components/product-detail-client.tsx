"use client"

import { useState, useEffect } from "react"
import { ProductGallery } from "@/components/product-gallery"
import { ProductInfo } from "@/components/product-info"
import { trackViewContent } from "@/lib/meta-pixel"

interface Product {
  id: string | number
  name: string
  price: number
  image_url?: string | null
  rating?: number
  variants?: Array<{ color: string; size: string; stock_quantity?: number; sku?: string }>
}

interface ProductDetail {
  sku: string
  description: string
  features: string[]
  colors: Array<{ name: string; hex: string; inStock: boolean }>
  availableSizes: string[]
  stockStatus: string
  reviewCount: number
  imagesByColor: Record<string, string[]>
  defaultImages: string[]
  reviews: unknown[]
  variants?: Array<{ color: string; size: string; stock_quantity?: number; sku?: string }>
}

interface ProductDetailClientProps {
  product: Product & { stock_quantity?: number }
  details: ProductDetail
  /** Dark NC United store — same image frame as product grid cards. */
  storeTheme?: boolean
}

const STORE_GALLERY_FRAME = "bg-[#0f1c2e] border border-white/5"
const STORE_THUMB_FRAME = "border-white/15"

export function ProductDetailClient({ product, details, storeTheme = false }: ProductDetailClientProps) {
  const [selectedColor, setSelectedColor] = useState(details.colors[0]?.name ?? "")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    trackViewContent(
      [String(product.id)],
      product.name,
      Number(product.price ?? 0),
      "USD"
    )
  }, [product.id, product.name, product.price])

  const currentImages =
    selectedColor && details.imagesByColor[selectedColor]?.length
      ? details.imagesByColor[selectedColor]
      : details.defaultImages

  const currentDisplayedImage = currentImages[currentImageIndex] ?? currentImages[0] ?? ""

  const variants = product.variants ?? details.variants ?? []

  return (
    <div className="mb-12 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery
        images={currentImages}
        productName={product.name}
        currentImageIndex={currentImageIndex}
        onImageChange={setCurrentImageIndex}
        frameClassName={storeTheme ? STORE_GALLERY_FRAME : undefined}
        thumbnailFrameClassName={storeTheme ? STORE_THUMB_FRAME : undefined}
        portraitFrame={false}
      />
      <ProductInfo
        product={product}
        details={details}
        variants={variants}
        selectedColor={selectedColor}
        onColorChange={(color) => {
          setSelectedColor(color)
          setCurrentImageIndex(0)
        }}
        currentImage={currentDisplayedImage}
        storeTheme={storeTheme}
      />
    </div>
  )
}
