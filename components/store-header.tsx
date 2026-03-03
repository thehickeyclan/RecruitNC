"use client"

import Link from "next/link"
import { StoreNavLink } from "@/components/store-nav-link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useCartStore } from "@/lib/store/cart-store"

interface StoreHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function StoreHeader({ searchQuery, onSearchChange }: StoreHeaderProps) {
  const items = useCartStore((s) => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/" className="font-semibold text-[#003366] hover:underline">
            RecruitNC
          </Link>
          <StoreNavLink className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Store</StoreNavLink>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 w-full"
          />
        </div>
        <Link
          href="/cart"
          className="relative flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground shrink-0"
        >
          Cart
          {count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#003366] px-1.5 text-xs text-white">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
