"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface ProductHeaderProps {
  productName: string
  category?: string | null
}

const formatCategoryName = (category: string | undefined): string => {
  if (!category) return "Products"

  const categoryMap: Record<string, string> = {
    "t-shirts": "T-Shirts",
    "sweatshirts": "Sweatshirts",
    "accessories": "Accessories",
    "hoodies": "Hoodies",
    "headwear": "Headwear",
    "athletic-wear": "Athletic Wear",
    "practice-fee": "Practice Fee",
  }

  return (
    categoryMap[category.toLowerCase()] ||
    category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

export function ProductHeader({ productName, category }: ProductHeaderProps) {
  const categoryDisplayName = formatCategoryName(category ?? undefined)

  return (
    <header className="border-b bg-background sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link
            href="/store"
            className="hover:text-foreground flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </Link>
        </div>

        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">&gt;</span>
          <Link href="/store" className="hover:text-foreground">
            Store
          </Link>
          <span className="mx-2">&gt;</span>
          <span className="hover:text-foreground">{categoryDisplayName}</span>
          <span className="mx-2">&gt;</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {productName}
          </span>
        </nav>
      </div>
    </header>
  )
}
