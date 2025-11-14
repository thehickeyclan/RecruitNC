"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface RobustImageProps {
  src: string
  alt: string
  fallbackSrc?: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
}

export function RobustImage({
  src,
  alt,
  fallbackSrc = "/diverse-wrestlers.png",
  className = "",
  width,
  height,
  fill = false,
}: RobustImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src)
  const [useImgTag, setUseImgTag] = useState<boolean>(false)
  const [imgError, setImgError] = useState<boolean>(false)

  useEffect(() => {
    // Reset state when src changes
    setImgSrc(src)
    setUseImgTag(false)
    setImgError(false)
  }, [src])

  // Check if the URL is external
  const isExternal = imgSrc?.startsWith("http") || imgSrc?.startsWith("https")

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true)

      // If using Next.js Image failed, try regular img tag
      if (!useImgTag && isExternal) {
        setUseImgTag(true)
        return
      }

      // If img tag also failed, use fallback
      setImgSrc(fallbackSrc)
    }
  }

  // If we're using a regular img tag
  if (useImgTag) {
    return (
      <img
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        className={className}
        style={fill ? { objectFit: "cover", width: "100%", height: "100%" } : {}}
        width={width}
        height={height}
        onError={handleImageError}
      />
    )
  }

  // Otherwise use Next.js Image
  return (
    <Image
      src={imgSrc || "/placeholder.svg"}
      alt={alt}
      className={className}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      onError={handleImageError}
      unoptimized={isExternal}
    />
  )
}
