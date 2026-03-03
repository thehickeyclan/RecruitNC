"use client"

import Link from "next/link"
import { StoreButton } from "@/components/store-button"
import { useCartStore } from "@/lib/store/cart-store"

export function MainHeader({
  showCart = true,
  showNav = true,
}: {
  showCart?: boolean
  showNav?: boolean
}) {
  const items = useCartStore((s) => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {showNav && (
            <Link href="/" className="font-semibold text-[#003366] hover:underline">
              RecruitNC
            </Link>
          )}
          <StoreButton className="text-sm text-muted-foreground hover:text-foreground cursor-pointer border-0 bg-transparent font-inherit p-0">Store</StoreButton>
        </div>
        {showCart && (
          <Link
            href="/store-app"
            className="relative flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cart
            {count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#003366] px-1.5 text-xs text-white">
                {count}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  )
}
