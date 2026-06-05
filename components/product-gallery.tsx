"use client"

import { useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, ZoomIn, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductGalleryProps {
  images: string[]
  productName: string
  currentImageIndex?: number
  onImageChange?: (index: number) => void
  /** Match store grid cards — dark frame so transparent PNGs blend in. */
  frameClassName?: string
  thumbnailFrameClassName?: string
  /** Taller frame for singlet mockups (portrait). */
  portraitFrame?: boolean
}

export function ProductGallery({
  images,
  productName,
  currentImageIndex,
  onImageChange,
  frameClassName = "bg-secondary",
  thumbnailFrameClassName = "border-border",
  portraitFrame = false,
}: ProductGalleryProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const safeImages = images?.length ? images : []
  const isControlled = currentImageIndex !== undefined
  const activeIndex = isControlled ? currentImageIndex : internalIndex

  const setIndex = (index: number) => {
    if (!isControlled) setInternalIndex(index)
    onImageChange?.(index)
  }

  const handlePrevious = () => {
    if (safeImages.length === 0) return
    const newIndex =
      activeIndex === 0 ? safeImages.length - 1 : activeIndex - 1
    setIndex(newIndex)
  }

  const handleNext = () => {
    if (safeImages.length === 0) return
    const newIndex =
      activeIndex === safeImages.length - 1 ? 0 : activeIndex + 1
    setIndex(newIndex)
  }

  const handleThumbnailClick = (index: number) => {
    setIndex(index)
  }

  const handleDotClick = (index: number) => {
    setIndex(index)
  }

  if (safeImages.length === 0) {
    return (
      <div className="aspect-square bg-secondary rounded-lg flex items-center justify-center">
        <ShoppingBag className="w-24 h-24 text-muted-foreground" />
      </div>
    )
  }

  const currentSrc = safeImages[activeIndex] ?? "/placeholder.svg"
  const isBlob = currentSrc.includes("blob.vercel-storage.com")

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative rounded-lg overflow-hidden cursor-zoom-in group",
          portraitFrame ? "aspect-[3/4]" : "aspect-square",
          frameClassName,
        )}
        onClick={() => setIsZoomOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setIsZoomOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Zoom image"
      >
        <div className={cn("absolute inset-4 md:inset-8", portraitFrame && "inset-3 md:inset-6")}>
          <Image
            src={currentSrc}
            alt={`${productName} - Image ${activeIndex + 1}`}
            fill
            className={cn(
              "object-contain object-center",
              portraitFrame && "object-top",
            )}
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized={isBlob}
          />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {safeImages.map((image, index) => {
          const src = image ?? "/placeholder.svg"
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all",
                activeIndex === index
                  ? "border-[#003366] ring-2 ring-[#003366]/20"
                  : cn(thumbnailFrameClassName, "hover:border-[#003366]/50")
              )}
            >
              <Image
                src={src}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                unoptimized={src.includes("blob.vercel-storage.com")}
              />
            </button>
          )
        })}
      </div>

      {safeImages.length > 1 && (
        <div className="flex justify-center gap-2">
          {safeImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDotClick(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                activeIndex === index
                  ? "bg-[#003366] w-6"
                  : "bg-border hover:bg-[#003366]/50"
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent
          className="max-w-5xl w-full p-0 bg-black/95 border-0 [&>button]:hidden"
          aria-describedby={undefined}
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="relative aspect-square w-full">
            <Image
              src={currentSrc}
              alt={`${productName} - Zoomed`}
              fill
              className="object-contain"
              unoptimized={isBlob}
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePrevious()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm z-10">
            {activeIndex + 1} / {safeImages.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
