"use client"

import Link from "next/link"
import { StoreNavLink } from "@/components/store-nav-link"
import { Search, ShoppingBag } from "lucide-react"
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A1628]/95 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 min-w-0 items-center gap-3 px-4 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-[#D3B574] flex items-center justify-center">
            <span className="text-[#0A1628] font-black text-sm">NC</span>
          </div>
          <span className="font-bold text-white tracking-tight hidden sm:inline">NC UNITED</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <StoreNavLink className="text-sm font-medium text-[#D3B574] cursor-pointer">
            Shop
          </StoreNavLink>
        </nav>

        <div className="relative ml-auto min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 w-full bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#D3B574]/50 focus:ring-[#D3B574]/20"
          />
        </div>

        <a
          href="/cart"
          target="_top"
          className="relative flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors shrink-0 bg-transparent border-0 cursor-pointer p-0"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D3B574] px-1.5 text-xs font-bold text-[#0A1628]">
              {count}
            </span>
          )}
        </a>
      </div>
    </header>
  )
}
