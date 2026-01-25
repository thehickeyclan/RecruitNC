"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingBag, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Product {
  id: number // BIGINT from database
  name: string
  description?: string
  price: number
  image_url?: string | null
  slug: string
  category?: string
  featured?: boolean
  in_stock?: boolean
}

export function StoreProductPromotion() {
  const [products, setProducts] = useState<Product[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/store/featured-products")
        const data = await response.json()
        if (data.products && data.products.length > 0) {
          setProducts(data.products)
        }
      } catch (error) {
        console.error("[Store Promotion] Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Rotate products every 5 seconds
  useEffect(() => {
    if (products.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [products.length])

  // Don't render if no products or still loading
  if (loading || products.length === 0) {
    return null
  }

  const currentProduct = products[currentIndex]

  return (
    <div className="mb-8">
      <div className="border border-[#CBAF5D] rounded-lg overflow-hidden bg-white shadow-md hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row">
          {/* Product Image - Fixed aspect ratio, no cutoff */}
          <div className="relative w-full md:w-48 aspect-square md:aspect-auto md:h-auto bg-gray-100 flex-shrink-0">
            {currentProduct.image_url ? (
              <Image
                src={currentProduct.image_url}
                alt={currentProduct.name}
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, 192px"
                unoptimized={currentProduct.image_url.includes('blob.vercel-storage.com')}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#002147] to-[#B31B1B] flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-white/50" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-[#002147] mb-4 line-clamp-2">
                {currentProduct.name}
              </h3>
            </div>
            
            <Link 
              href="https://store.ncwrestlingunited.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4"
            >
              <Button 
                className="w-full bg-[#B31B1B] hover:bg-[#8B1515] text-white font-semibold"
                size="lg"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop Now
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Product Indicators (if multiple products) */}
        {products.length > 1 && (
          <div className="flex items-center justify-center gap-2 p-2 bg-gray-50 border-t border-[#CBAF5D]/20">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-[#B31B1B] w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`View product ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
