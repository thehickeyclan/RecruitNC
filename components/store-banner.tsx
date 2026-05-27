"use client"

interface StoreBannerProps {
  onShopAll: () => void
  onShopCategory: (categoryId: string) => void
}

const categories = ["Singlets", "T-Shirts", "Sweatshirts", "Headwear", "Accessories"]

export function StoreBanner({ onShopAll, onShopCategory }: StoreBannerProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#0A1628] to-[#0f1c2e]">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="container relative mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#D3B574] text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Official NC United Gear
          </p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4 text-balance">
            Gear Up for the Mat
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Every purchase supports NC wrestlers. Premium apparel for athletes, families, and fans.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onShopAll}
              className="px-6 py-2.5 bg-[#D3B574] text-[#0A1628] font-semibold rounded-lg hover:bg-[#c4a665] transition-colors"
            >
              Shop All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onShopCategory(cat)}
                className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/80 rounded-lg font-medium hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
