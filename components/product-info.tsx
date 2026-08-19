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
import { getStoreProductShipLabel } from "@/lib/store/product-utils"

interface Product {
  id: string | number
  name: string
  price: number
  slug?: string | null
  category?: string | null
  image_url?: string | null
  rating?: number
  variants?: Array<{ id: string; color: string; size: string; stock_quantity?: number; sku?: string }>
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
  variants?: Array<{ id: string; color: string; size: string; stock_quantity?: number; sku?: string }>
}

interface ProductInfoProps {
  product: Product & { stock_quantity?: number }
  details: ProductDetail
  variants?: Array<{ id: string; color: string; size: string; stock_quantity?: number; sku?: string }>
  selectedColor: string
  onColorChange: (color: string) => void
  currentImage?: string
  storeTheme?: boolean
}

export function ProductInfo({
  product,
  details,
  variants,
  selectedColor,
  onColorChange,
  currentImage,
  storeTheme = false,
}: ProductInfoProps) {
  const productVariants = variants ?? product.variants ?? []
  const shipLabel = getStoreProductShipLabel(product)
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
      (v: { id: string; color: string; size: string; stock_quantity?: number; sku?: string }) =>
        v.color === selectedColor && v.size === effectiveSize
    )
    if (!variant?.id) {
      toast({
        title: "Selection unavailable",
        description: "That size and color combination is no longer available. Please choose another option.",
        variant: "destructive",
      })
      return
    }
    const variantStock = variant?.stock_quantity ?? 0
    if (variantStock < quantity) {
      toast({
        title: "Not enough inventory",
        description: `Only ${Math.max(0, variantStock)} of this option ${variantStock === 1 ? "is" : "are"} available.`,
        variant: "destructive",
      })
      return
    }

    addItem({
      id: String(product.id),
      variantId: String(variant.id),
      name: product.name,
      price: product.price,
      image: imageToUse,
      variant: { color: selectedColor, size: effectiveSize },
      sku: variant?.sku ?? details.sku,
      quantity,
      stock: variantStock > 10 ? "in-stock" : "low-stock",
      stockQuantity: variantStock,
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

  const selectedVariant = productVariants.find(
    (variant) => variant.color === selectedColor && variant.size === effectiveSize,
  )
  const maxQty = getMaxQuantityForItem({
    sku: selectedVariant?.sku ?? details.sku,
    name: product.name,
    stockQuantity: selectedVariant?.stock_quantity,
  })

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
    <div className="min-w-0 space-y-6">
      <div>
        <h1
          className={cn(
            "mb-2 break-words text-3xl font-bold lg:text-4xl",
            storeTheme ? "text-white" : "text-foreground",
          )}
        >
          {product.name}
        </h1>
        <p className={cn("text-sm mb-3", storeTheme ? "text-white/55" : "text-muted-foreground")}>
          SKU: {details.sku}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            {renderStars(product.rating ?? 0)}
          </div>
          <a
            href="#reviews"
            className={cn(
              "text-sm hover:underline",
              storeTheme ? "text-[#D3B574]" : "text-[#003366]",
            )}
          >
            ({details.reviewCount} reviews)
          </a>
        </div>

        <p className={cn("text-3xl font-bold", storeTheme ? "text-white" : "text-foreground")}>
          ${Number(product.price).toFixed(2)}
        </p>
      </div>

      <div className={cn("border-t pt-6", storeTheme && "border-white/10")}>
        <p
          className={cn(
            "leading-relaxed mb-4",
            storeTheme ? "text-white/75" : "text-muted-foreground",
          )}
        >
          {details.description}
        </p>

        <div className="space-y-2">
          <p className={cn("font-semibold text-sm", storeTheme ? "text-white" : "text-foreground")}>
            Features:
          </p>
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

      <div className={cn("space-y-6 border-t pt-6", storeTheme && "border-white/10")}>
        {showSizeSelector && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className={cn("text-sm font-semibold", storeTheme ? "text-white" : "text-foreground")}>Select Size</label>
              <button
                type="button"
                onClick={() => setShowSizeGuide(true)}
                className={cn("text-sm hover:underline", storeTheme ? "text-[#D3B574]" : "text-[#003366]")}
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
          <label className={cn("mb-3 block text-sm font-semibold", storeTheme ? "text-white" : "text-foreground")}>Select Color</label>
          <div className="flex flex-wrap gap-3">
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
          <label
            className={cn(
              "font-semibold text-sm mb-3 block",
              storeTheme ? "text-white" : "text-foreground",
            )}
          >
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
              className={cn(
                storeTheme &&
                  "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-40",
              )}
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
              className={cn(
                "w-16 text-center border rounded-md py-2 font-medium tabular-nums",
                storeTheme
                  ? "bg-white text-[#0A1628] border-white/30 focus:outline-none focus:ring-2 focus:ring-[#D3B574]/50"
                  : "bg-background text-foreground border-input",
              )}
              min={1}
              max={maxQty}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= maxQty}
              className={cn(
                storeTheme &&
                  "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:opacity-40",
              )}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {details.stockStatus === "in-stock" && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className={cn("min-w-0 text-sm", storeTheme ? "text-white/70" : "text-muted-foreground")}>
                In Stock — {shipLabel}
              </span>
            </>
          )}
          {details.stockStatus === "low-stock" && (
            <>
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className={cn("min-w-0 text-sm", storeTheme ? "text-white/70" : "text-muted-foreground")}>
                Low Stock — {shipLabel}
              </span>
            </>
          )}
          {details.stockStatus === "out-of-stock" && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className={cn("text-sm", storeTheme ? "text-white/70" : "text-muted-foreground")}>Out of Stock</span>
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
            ) : details.stockStatus === "out-of-stock" ? (
              "Sold Out"
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

      <div className={cn("border-t pt-6", storeTheme && "border-white/10")}>
        <p className={cn("mb-3 text-sm font-semibold", storeTheme ? "text-white" : "text-foreground")}>Share this product</p>
        <div className="flex flex-wrap gap-3">
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
