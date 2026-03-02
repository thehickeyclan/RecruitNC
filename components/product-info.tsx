"use client"

import { useState } from "react"
import {
  Star,
  Heart,
  Check,
  Minus,
  Plus,
  Facebook,
  Twitter,
  Instagram,
  LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SizeGuideModal } from "@/components/size-guide-modal"
import { useCartStore, getMaxQuantityForItem } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"
import { trackAddToCart } from "@/lib/meta-pixel"
import { shouldShowSizeSelector } from "@/lib/size-utils"

function toCartProductId(id: string | number): number {
  if (typeof id === "number" && Number.isInteger(id)) return id
  const s = String(id)
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h) || 0
}

interface Product {
  id: string | number
  name: string
  price: number
  category?: string | null
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

interface ProductInfoProps {
  product: Product & { stock_quantity?: number }
  details: ProductDetail
  variants?: Array<{ color: string; size: string; stock_quantity?: number; sku?: string }>
  selectedColor: string
  onColorChange: (color: string) => void
  currentImage?: string
}

export function ProductInfo({
  product,
  details,
  variants,
  selectedColor,
  onColorChange,
  currentImage,
}: ProductInfoProps) {
  const productVariants = variants ?? product.variants ?? []
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [errors, setErrors] = useState({ size: false, color: false })
  const [linkCopied, setLinkCopied] = useState(false)

  const { addItem, autoAddRivalryTee } = useCartStore()
  const { toast } = useToast()

  const showSizeSelector = shouldShowSizeSelector(
    details.availableSizes,
    product.category,
    product.name
  )

  const effectiveSize = showSizeSelector
    ? selectedSize
    : details.availableSizes[0] ?? "One Size"

  const handleAddToCart = () => {
    if ((showSizeSelector && !selectedSize) || !selectedColor) {
      setErrors({
        size: showSizeSelector && !selectedSize,
        color: !selectedColor,
      })
      toast({
        title: "Selection required",
        description: showSizeSelector
          ? "Please select both size and color before adding to cart."
          : "Please select a color before adding to cart.",
        variant: "destructive",
      })
      return
    }

    setErrors({ size: false, color: false })

    const colorSpecificImage =
      details.imagesByColor[selectedColor]?.[0] ?? currentImage
    const imageToUse =
      colorSpecificImage ?? product.image_url ?? "/placeholder.svg"

    const variant = productVariants.find(
      (v: { color: string; size: string; stock_quantity?: number; sku?: string }) =>
        v.color === selectedColor && v.size === effectiveSize
    )
    const variantStock = variant?.stock_quantity ?? 0

    addItem({
      id: toCartProductId(product.id),
      name: product.name,
      price: product.price,
      image: imageToUse,
      variant: { color: selectedColor, size: effectiveSize },
      sku: variant?.sku ?? details.sku,
      quantity,
      stock: variantStock > 10 ? "in-stock" : "low-stock",
    })

    trackAddToCart(
      [String(product.id)],
      product.name,
      Number(product.price ?? 0) * quantity,
      "USD",
      "product",
      quantity
    )

    setIsAdded(true)
    toast({
      title: "Added to cart",
      description: `${product.name} (${selectedColor}${showSizeSelector ? `, ${effectiveSize}` : ""}) x${quantity} has been added to your cart.`,
    })

    const isRivalryProduct = product.name.toLowerCase().includes("rivalry")
    if (!isRivalryProduct) {
      setTimeout(async () => {
        const wasAdded = await autoAddRivalryTee()
        if (wasAdded) {
          toast({
            title: "🎉 Free Rivalry Tee Added!",
            description:
              "A free Rivalry Tee has been automatically added to your cart with any purchase!",
          })
        }
      }, 200)
    }

    setTimeout(() => setIsAdded(false), 2000)
  }

  const maxQty = getMaxQuantityForItem({ sku: details.sku, name: product.name })

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxQty, prev + delta)))
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(rating)
      const half = i === Math.floor(rating) && rating % 1 !== 0
      return (
        <Star
          key={i}
          className={cn(
            "w-5 h-5",
            filled
              ? "fill-yellow-400 text-yellow-400"
              : half
                ? "fill-yellow-400/50 text-yellow-400"
                : "text-gray-300"
          )}
        />
      )
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
          {product.name}
        </h1>
        <p className="text-sm text-muted-foreground mb-3">SKU: {details.sku}</p>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            {renderStars(product.rating ?? 0)}
          </div>
          <a href="#reviews" className="text-sm text-[#003366] hover:underline">
            ({details.reviewCount} reviews)
          </a>
        </div>

        <p className="text-3xl font-bold text-foreground">
          ${Number(product.price).toFixed(2)}
        </p>
      </div>

      <div className="border-t pt-6">
        <p className="text-muted-foreground leading-relaxed mb-4">
          {details.description}
        </p>

        <div className="space-y-2">
          <p className="font-semibold text-sm text-foreground">Features:</p>
          <ul className="space-y-1">
            {details.features.map((feature, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-[#003366] mt-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t pt-6 space-y-6">
        {showSizeSelector && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-semibold text-sm">Select Size</label>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className="text-sm text-[#003366] hover:underline"
              >
                Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {details.availableSizes.map((size) => {
                const variant = productVariants.find(
                  (v: { size?: string; color?: string; stock_quantity?: number }) =>
                    v.size === size && v.color === selectedColor
                )
                const stockQuantity = variant?.stock_quantity ?? 0
                const isAvailable = stockQuantity > 0

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      if (isAvailable) setSelectedSize(size)
                    }}
                    disabled={!isAvailable}
                    className={cn(
                      "px-4 py-2 border-2 rounded-md font-medium transition-all text-sm min-w-[60px]",
                      selectedSize === size
                        ? "bg-[#003366] text-white border-[#003366]"
                        : isAvailable
                          ? "bg-white text-[#003366] border-[#003366] hover:bg-[#003366]/5"
                          : "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50",
                      errors.size && !selectedSize && "border-red-500"
                    )}
                    title={
                      !isAvailable
                        ? "Out of stock"
                        : stockQuantity <= 5
                          ? `Only ${stockQuantity} left`
                          : undefined
                    }
                  >
                    {size}
                    {!isAvailable && <span className="ml-1 text-xs">(OOS)</span>}
                  </button>
                )
              })}
            </div>
            {errors.size && !selectedSize && (
              <p className="text-sm text-red-500 mt-2">Please select a size</p>
            )}
          </div>
        )}

        <div>
          <label className="font-semibold text-sm mb-3 block">Select Color</label>
          <div className="flex gap-3">
            {details.colors.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => {
                  if (color.inStock) onColorChange(color.name)
                }}
                disabled={!color.inStock}
                className={cn(
                  "relative w-12 h-12 rounded-full border-2 transition-all",
                  selectedColor === color.name
                    ? "border-[#003366] ring-2 ring-[#003366]/20"
                    : "border-gray-300",
                  !color.inStock && "opacity-50 cursor-not-allowed"
                )}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              >
                {selectedColor === color.name && (
                  <Check
                    className="w-6 h-6 absolute inset-0 m-auto"
                    style={{
                      color:
                        color.hex === "#FFFFFF" || color.hex === "#F8F8F8"
                          ? "#000000"
                          : "#FFFFFF",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
          {errors.color && !selectedColor && (
            <p className="text-sm text-red-500 mt-2">Please select a color</p>
          )}
        </div>

        <div>
          <label className="font-semibold text-sm mb-3 block">Quantity</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <input
              type="number"
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(maxQty, Number.parseInt(e.target.value, 10) || 1)
                  )
                )
              }
              className="w-16 text-center border rounded-md py-2 font-medium"
              min={1}
              max={maxQty}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= maxQty}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {details.stockStatus === "in-stock" && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-muted-foreground">
                In Stock - Ships in 1-2 business days
              </span>
            </>
          )}
          {details.stockStatus === "low-stock" && (
            <>
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-sm text-muted-foreground">
                Low Stock - Only 3 left!
              </span>
            </>
          )}
          {details.stockStatus === "out-of-stock" && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm text-muted-foreground">Out of Stock</span>
            </>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAddToCart}
            disabled={isAdded || details.stockStatus === "out-of-stock"}
            className="w-full bg-[#003366] hover:bg-[#003366]/90 text-white h-12 text-base font-semibold"
          >
            {isAdded ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Added!
              </>
            ) : (
              "Add to Cart"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsWishlisted(!isWishlisted)}
            className="w-full h-12 text-base font-semibold"
          >
            <Heart
              className={cn(
                "w-5 h-5 mr-2",
                isWishlisted && "fill-red-500 text-red-500"
              )}
            />
            {isWishlisted ? "Added to Wishlist" : "Add to Wishlist"}
          </Button>
        </div>
      </div>

      <div className="border-t pt-6">
        <p className="font-semibold text-sm mb-3">Share this product</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-transparent"
          >
            <Facebook className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-transparent"
          >
            <Twitter className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-transparent"
          >
            <Instagram className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-transparent"
            onClick={handleCopyLink}
          >
            {linkCopied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <LinkIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <SizeGuideModal open={showSizeGuide} onOpenChange={setShowSizeGuide} />
    </div>
  )
}
