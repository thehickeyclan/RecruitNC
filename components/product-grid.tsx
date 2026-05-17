"use client"

import { ProductCard } from "@/components/product-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SortOption = "featured" | "price-low" | "price-high" | "newest"

export interface ProductGridProduct {
  id: string | number
  name: string
  description?: string | null
  price: number
  category?: string | null
  created_at?: string | null
  variants?: Array<{ size?: string; color?: string }>
  image_url?: string | null
  images?: Array<{ url: string; display_order?: number }>
  rating?: number
  stock_quantity?: number
  is_featured?: boolean
}

interface ProductGridProps {
  products: ProductGridProduct[]
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
}

export function ProductGrid({ products, sortBy, onSortChange }: ProductGridProps) {
  return (
    <div className="flex-1" id="products">
      <div className="flex items-center justify-between mb-8">
        <p className="text-white/50">
          <span className="font-semibold text-white">{products.length}</span>{" "}
          {products.length === 1 ? "item" : "items"}
        </p>

        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white/80">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-[#0f1c2e] border-white/10">
            <SelectItem value="featured" className="text-white/80 focus:bg-white/10 focus:text-white">Featured</SelectItem>
            <SelectItem value="price-low" className="text-white/80 focus:bg-white/10 focus:text-white">Price: Low to High</SelectItem>
            <SelectItem value="price-high" className="text-white/80 focus:bg-white/10 focus:text-white">Price: High to Low</SelectItem>
            <SelectItem value="newest" className="text-white/80 focus:bg-white/10 focus:text-white">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/40 text-lg">
            No products found matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={String(product.id)} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
