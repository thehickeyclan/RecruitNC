"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fallbackSrc?: string
  priority?: boolean
}

export function LazyImage({
  src,
  alt,
  width = 200,
  height = 200,
  className = "",
  fallbackSrc = "/wrestler-silhouette.png",
  priority = false,
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(priority ? src : fallbackSrc)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: "50px" },
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [priority])

  useEffect(() => {
    if (isInView && !isLoaded && imageSrc === fallbackSrc) {
      setImageSrc(src)
    }
  }, [isInView, isLoaded, src, imageSrc, fallbackSrc])

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      <Image
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-70"}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc)
          }
        }}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  )
}
