"use client"

import { useState, useMemo } from "react"
import { StoreHeader } from "@/components/store-header"
import { FilterSidebar } from "@/components/filter-sidebar"
import { ProductGrid, type SortOption, type ProductGridProduct } from "@/components/product-grid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const categories = [
  { id: "T-Shirts", label: "T-Shirts" },
  { id: "Sweatshirts", label: "Sweatshirts" },
  { id: "Headwear", label: "Headwear" },
  { id: "Accessories", label: "Accessories" },
]

interface ProductsPageClientProps {
  initialProducts: ProductGridProduct[]
}

export function ProductsPageClient({ initialProducts }: ProductsPageClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("featured")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredProducts = useMemo(() => {
    let filtered = [...initialProducts]

    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description?.toLowerCase() ?? "").includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => {
        if (!product.category) return false
        const productCategory = product.category.toLowerCase()
        return selectedCategories.some((cat) => cat.toLowerCase() === productCategory)
      })
    }

    if (selectedSizes.length > 0) {
      filtered = filtered.filter((product) => {
        const variants = (product.variants ?? []) as Array<{ size?: string }>
        return variants.some((v) => v.size && selectedSizes.includes(v.size))
      })
    }

    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter((product) => {
        const price = Number(product.price)
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
        filtered.sort((a, b) => Number(a.price) - Number(b.price))
        break
      case "price-high":
        filtered.sort((a, b) => Number(b.price) - Number(a.price))
        break
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )
        break
      case "featured":
      default:
        break
    }

    return filtered
  }, [
    initialProducts,
    selectedCategories,
    selectedSizes,
    selectedPriceRanges,
    sortBy,
    searchQuery,
  ])

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

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#003366]">
            All Products
          </h1>
          <p className="text-muted-foreground">Browse our complete collection</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategories.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedCategories([])}
              className="rounded-full"
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategories.includes(category.id) ? "default" : "outline"
                }
                onClick={() => handleCategoryToggle(category.id)}
                className="rounded-full"
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

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        <ProductGrid
          products={filteredProducts}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>
    </div>
  )
}
