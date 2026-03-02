"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SlidersHorizontal } from "lucide-react"

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]
const PRICE_RANGES = [
  { id: "under-25", label: "Under $25" },
  { id: "25-50", label: "$25 – $50" },
  { id: "50-75", label: "$50 – $75" },
  { id: "over-75", label: "Over $75" },
]

const CATEGORY_OPTIONS = [
  { id: "T-Shirts", label: "T-Shirts" },
  { id: "Sweatshirts", label: "Sweatshirts" },
  { id: "Headwear", label: "Headwear" },
  { id: "Accessories", label: "Accessories" },
]

interface FilterSidebarProps {
  selectedCategories: string[]
  selectedSizes: string[]
  selectedPriceRanges: string[]
  onCategoriesChange: (categories: string[]) => void
  onSizesChange: (sizes: string[]) => void
  onPriceRangesChange: (ranges: string[]) => void
  onClearFilters: () => void
  activeFiltersCount: number
}

export function FilterSidebar({
  selectedCategories,
  selectedSizes,
  selectedPriceRanges,
  onCategoriesChange,
  onSizesChange,
  onPriceRangesChange,
  onClearFilters,
  activeFiltersCount,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false)

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== id))
    } else {
      onCategoriesChange([...selectedCategories, id])
    }
  }

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      onSizesChange(selectedSizes.filter((s) => s !== size))
    } else {
      onSizesChange([...selectedSizes, size])
    }
  }

  const togglePriceRange = (id: string) => {
    if (selectedPriceRanges.includes(id)) {
      onPriceRangesChange(selectedPriceRanges.filter((r) => r !== id))
    } else {
      onPriceRangesChange([...selectedPriceRanges, id])
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#003366] px-1.5 text-xs text-white">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-8">
          <div>
            <p className="text-sm font-medium mb-3">Category</p>
            <div className="space-y-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <span className="text-sm">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Size</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <label
                  key={size}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedSizes.includes(size)}
                    onCheckedChange={() => toggleSize(size)}
                  />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-3">Price</p>
            <div className="space-y-2">
              {PRICE_RANGES.map((range) => (
                <label
                  key={range.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPriceRanges.includes(range.id)}
                    onCheckedChange={() => togglePriceRange(range.id)}
                  />
                  <span className="text-sm">{range.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onClearFilters()
              setOpen(false)
            }}
            className="w-full"
          >
            Clear filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
