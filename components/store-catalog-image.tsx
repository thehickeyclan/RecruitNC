"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { isStoreSingletProduct } from "@/lib/store/product-utils"

interface StoreCatalogImageProps {
  src: string
  alt: string
  /** When omitted, inferred from product slug/name. */
  singlet?: boolean
  product?: { slug?: string | null; name?: string | null }
  className?: string
  imageClassName?: string
  hoverZoom?: boolean
  priority?: boolean
  sizes?: string
}

/** Dark-store product photo — square frame, inset contain. Same navy backdrop for all categories. */
export function StoreCatalogImage({
  src,
  alt,
  singlet: singletProp,
  product,
  className,
  imageClassName,
  hoverZoom = false,
  priority,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
}: StoreCatalogImageProps) {
  const isSinglet = singletProp ?? (product ? isStoreSingletProduct(product) : false)

  return (
    <div className={cn("absolute inset-3 sm:inset-4 md:inset-5", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={cn(
          "object-contain object-center",
          isSinglet && "object-top",
          hoverZoom && "transition-transform duration-500 group-hover:scale-105",
          imageClassName,
        )}
        sizes={sizes}
        unoptimized={src.includes("blob.vercel-storage.com")}
      />
    </div>
  )
}

export const STORE_CATALOG_FRAME_CLASS =
  "relative aspect-square overflow-hidden rounded-xl bg-[#0f1c2e] border border-white/5"
