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
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{products.length}</span>{" "}
          items
        </p>

        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No products found matching your filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={String(product.id)} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
