"use client"

import Link from "next/link"
import { StoreNavLink } from "@/components/store-nav-link"
import { ChevronLeft } from "lucide-react"

interface ProductHeaderProps {
  productName: string
  category?: string | null
  variant?: "default" | "store"
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

export function ProductHeader({ productName, category, variant = "default" }: ProductHeaderProps) {
  const categoryDisplayName = formatCategoryName(category ?? undefined)
  const isStore = variant === "store"

  return (
    <header
      className={
        isStore
          ? "border-b border-white/10 bg-[#0A1628]/95 backdrop-blur-xl sticky top-0 z-40"
          : "border-b bg-background sticky top-0 z-40 shadow-sm"
      }
    >
      <div className="container mx-auto px-4 py-4">
        <div
          className={`flex items-center gap-2 text-sm mb-2 ${isStore ? "text-white/60" : "text-muted-foreground"}`}
        >
          <StoreNavLink
            className={`flex items-center gap-1 cursor-pointer ${isStore ? "hover:text-white" : "hover:text-foreground"}`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </StoreNavLink>
        </div>

        <nav className={`text-sm ${isStore ? "text-white/60" : "text-muted-foreground"}`}>
          <Link href="/" className={isStore ? "hover:text-white" : "hover:text-foreground"}>
            Home
          </Link>
          <span className="mx-2">&gt;</span>
          <StoreNavLink className={isStore ? "hover:text-white cursor-pointer" : "hover:text-foreground cursor-pointer"}>
            Store
          </StoreNavLink>
          <span className="mx-2">&gt;</span>
          <span className={isStore ? "hover:text-white" : "hover:text-foreground"}>{categoryDisplayName}</span>
          <span className="mx-2">&gt;</span>
          <span
            className={`font-medium truncate max-w-[200px] ${isStore ? "text-white" : "text-foreground"}`}
          >
            {productName}
          </span>
        </nav>
      </div>
    </header>
  )
}
