"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { StoreHeader } from "@/components/store-header"
import { StoreBanner } from "@/components/store-banner"
import { FeaturedProductsSection } from "@/components/featured-products-section"
import { FilterSidebar } from "@/components/filter-sidebar"
import { ProductGrid, type SortOption, type ProductGridProduct } from "@/components/product-grid"
import { FeaturesSection } from "@/components/features-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import { isStoreSingletProduct } from "@/lib/store/product-utils"
import { useToast } from "@/hooks/use-toast"

interface StorePageClientProps {
  initialProducts: ProductGridProduct[]
}

const categories = [
  { id: "Singlets", label: "Singlets" },
  { id: "T-Shirts", label: "T-Shirts" },
  { id: "Sweatshirts", label: "Sweatshirts" },
  { id: "Headwear", label: "Headwear" },
  { id: "Accessories", label: "Accessories" },
]

export function StorePageClient({ initialProducts }: StorePageClientProps) {
  const searchParams = useSearchParams()
  const { applyPromoCode, promoCode } = useCartStore()
  const { toast } = useToast()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("featured")
  const [searchQuery, setSearchQuery] = useState("")

  // Sync category filter from URL (e.g. /?category=T-Shirts from banner or shared link)
  useEffect(() => {
    const category = searchParams?.get("category")
    if (category && categories.some((c) => c.id === category)) {
      setSelectedCategories([category])
      requestAnimationFrame(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }))
    }
  }, [searchParams])

  // Auto-apply promo code from URL parameter (no replaceState to avoid Next router refetch / store canceled)
  useEffect(() => {
    const promoParam = searchParams?.get("promo") || searchParams?.get("promoCode")
    if (promoParam && promoParam !== promoCode) {
      applyPromoCode(promoParam).then((success) => {
        if (success) {
          toast({
            title: "Promo code applied!",
            description: `Promo code "${promoParam}" has been applied to your cart.`,
          })
        }
      })
    }
  }, [searchParams, promoCode, applyPromoCode, toast])

  const filteredProducts = useMemo(() => {
    let filtered = [...initialProducts]

    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => {
        return selectedCategories.some((cat) => {
          if (cat === "Singlets") return isStoreSingletProduct(product)
          if (!product.category) return false
          return cat.toLowerCase() === product.category.toLowerCase()
        })
      })
    }

    if (selectedSizes.length > 0) {
      filtered = filtered.filter((product) => {
        const variants = (product.variants ?? []) as Array<{ size?: string }>
        return variants.some((v) => selectedSizes.includes(v.size ?? ""))
      })
    }

    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter((product) => {
        const price = product.price
        return selectedPriceRanges.some((range) => {
          if (range === "under-25") return price < 25
          if (range === "25-50") return price >= 25 && price <= 50
          if (range === "50-75") return price >= 50 && price <= 75
          if (range === "over-75") return price > 75
          return false
        })
      })
    }

    switch (sortBy) {
      case "price-low":
        filtered = [...filtered].sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered = [...filtered].sort((a, b) => b.price - a.price)
        break
      case "newest":
        filtered = [...filtered].sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )
        break
      case "featured":
      default:
        break
    }

    return filtered
  }, [initialProducts, selectedCategories, selectedSizes, selectedPriceRanges, sortBy, searchQuery])

  const handleClearFilters = () => {
    setSelectedCategories([])
    setSelectedSizes([])
    setSelectedPriceRanges([])
  }

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== categoryId))
    } else {
      setSelectedCategories([categoryId])
    }
  }

  const activeFiltersCount = selectedSizes.length + selectedPriceRanges.length

  const scrollToProducts = () => {
    setSelectedCategories([])
    setTimeout(
      () => document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100,
    )
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <StoreHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <StoreBanner
        onShopAll={() => {
          setSelectedCategories([])
          setTimeout(
            () => document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }),
            100,
          )
        }}
        onShopCategory={(categoryId) => {
          setSelectedCategories([categoryId])
          setTimeout(
            () => document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }),
            100,
          )
        }}
      />

      <FeaturedProductsSection products={initialProducts} onViewAll={scrollToProducts} />

      <div id="products" className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button
              variant={selectedCategories.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedCategories([])}
              className={selectedCategories.length === 0
                ? "rounded-full bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665] font-semibold"
                : "rounded-full bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                onClick={() => handleCategoryToggle(category.id)}
                className={selectedCategories.includes(category.id)
                  ? "rounded-full bg-[#D3B574] text-[#0A1628] hover:bg-[#c4a665] font-semibold"
                  : "rounded-full bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                }
              >
                {category.label}
              </Button>
            ))}
          </div>

          <FilterSidebar
            selectedCategories={selectedCategories}
            selectedSizes={selectedSizes}
            selectedPriceRanges={selectedPriceRanges}
            onCategoriesChange={setSelectedCategories}
            onSizesChange={setSelectedSizes}
            onPriceRangesChange={setSelectedPriceRanges}
            onClearFilters={handleClearFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>

        <div className="mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#D3B574]/50 focus:ring-[#D3B574]/20"
            />
          </div>
        </div>

        <ProductGrid products={filteredProducts} sortBy={sortBy} onSortChange={setSortBy} />
      </div>

      <FeaturesSection />
    </div>
  )
}
