"use client"

import { useState, useEffect } from "react"
import Image, { type ImageProps } from "next/image"

interface ImageFallbackProps extends Omit<ImageProps, "src" | "alt"> {
  src: string
  fallbackSrc: string
  alt: string
}

export function ImageFallback({ src, fallbackSrc, alt, ...props }: ImageFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Reset error state when src changes
    setError(false)
    setImgSrc(src)
  }, [src])

  const handleError = () => {
    if (!error) {
      setImgSrc(fallbackSrc)
      setError(true)
    }
  }

  return <Image {...props} src={imgSrc || "/placeholder.svg"} alt={alt} onError={handleError} />
}
