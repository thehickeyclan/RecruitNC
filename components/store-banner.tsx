"use client"

interface StoreBannerProps {
  onShopAll: () => void
  onShopCategory: (categoryId: string) => void
}

export function StoreBanner({ onShopAll, onShopCategory }: StoreBannerProps) {
  return (
    <div className="border-b bg-muted/30 py-4">
      <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onShopAll}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Shop All
        </button>
        {["T-Shirts", "Sweatshirts", "Headwear", "Accessories"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onShopCategory(cat)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}
