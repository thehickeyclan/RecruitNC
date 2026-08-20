"use client";

import type React from "react";
import { useState } from "react";
import { StoreLink } from "@/components/store-link";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { getColorHex } from "@/lib/color-utils";
import {
  StoreCatalogImage,
  STORE_CATALOG_FRAME_CLASS,
} from "@/components/store-catalog-image";
import { isToc2026PreorderItem } from "@/lib/store/toc-preorder";

interface ProductCardProduct {
  id: string | number;
  name: string;
  slug?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  stock_quantity?: number;
  rating?: number;
  is_featured?: boolean;
  variants?: Array<{ color?: string }>;
  images?: Array<{ url: string; display_order?: number }>;
}

interface ProductCardProps {
  product: ProductCardProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const variants = product.variants ?? [];
  const images = product.images ?? [];

  const uniqueColors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean)),
  );
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  const getCurrentImage = () => {
    if (images.length > 0) {
      const sorted = [...images].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
      );
      const imageIndex = Math.min(currentColorIndex, sorted.length - 1);
      return sorted[imageIndex]?.url ?? sorted[0]?.url;
    }
    return product.image_url ?? "/placeholder.svg";
  };

  const handlePrevColor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentColorIndex((prev) =>
      prev === 0 ? uniqueColors.length - 1 : prev - 1,
    );
  };

  const handleNextColor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentColorIndex((prev) =>
      prev === uniqueColors.length - 1 ? 0 : prev + 1,
    );
  };

  const handleColorClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentColorIndex(index);
  };

  const productId = String(product.id);
  const productUrl = `/store-app/product/${productId}`;
  const currentImage = getCurrentImage();
  const stockQty = product.stock_quantity ?? 0;
  const rating = product.rating ?? 0;
  const isPreorder = isToc2026PreorderItem(product);

  return (
    <div className="group relative">
      <StoreLink href={productUrl} className="block cursor-pointer">
        <div className={STORE_CATALOG_FRAME_CLASS}>
          {currentImage ? (
            <StoreCatalogImage
              src={currentImage}
              alt={product.name}
              product={product}
              hoverZoom
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30">
              No image
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Color navigation arrows */}
          {uniqueColors.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevColor}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 z-10 backdrop-blur-sm"
                aria-label="Previous color"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={handleNextColor}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 z-10 backdrop-blur-sm"
                aria-label="Next color"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {isPreorder && (
              <Badge className="border border-[#D3B574]/50 bg-[#0A1628]/95 text-[#D3B574] font-black uppercase tracking-[0.12em] text-[10px]">
                Pre-order
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-[#D3B574] text-[#0A1628] font-semibold border-0 text-xs">
                Featured
              </Badge>
            )}
            {stockQty <= 0 && (
              <Badge className="bg-white/15 text-white/90 font-semibold border border-white/20 text-xs">
                Sold Out
              </Badge>
            )}
            {stockQty <= 5 && stockQty > 0 && (
              <Badge className="bg-[#BC0B03] text-white font-semibold border-0 text-xs">
                Low Stock
              </Badge>
            )}
          </div>

          <div className="absolute bottom-3 inset-x-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
            <div className="w-full py-2.5 bg-[#D3B574] text-[#0A1628] font-semibold text-sm rounded-lg text-center">
              View Product
            </div>
          </div>
        </div>

        {/* Product info */}
        <div className="mt-4 space-y-2">
          {product.category && (
            <p className="text-xs font-medium text-[#D3B574]/80 uppercase tracking-wider">
              {product.category}
            </p>
          )}

          <h3 className="font-semibold text-white text-base line-clamp-2 text-balance group-hover:text-[#D3B574] transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(rating)
                      ? "fill-[#D3B574] text-[#D3B574]"
                      : "fill-white/10 text-white/10"
                  }`}
                />
              ))}
            </div>
            {rating > 0 && (
              <span className="text-xs text-white/50">
                ({rating.toFixed(1)})
              </span>
            )}
          </div>

          {/* Color swatches */}
          {uniqueColors.length > 0 && (
            <div className="flex items-center gap-1.5">
              {uniqueColors.map((color, index) => {
                const hexColor = getColorHex(color);
                const isActive = index === currentColorIndex;
                return (
                  <button
                    key={color}
                    type="button"
                    className={`w-4 h-4 rounded-full cursor-pointer hover:scale-125 transition-transform shrink-0 ${
                      isActive
                        ? "ring-2 ring-[#D3B574] ring-offset-2 ring-offset-[#0A1628]"
                        : "ring-1 ring-white/20"
                    }`}
                    style={{ backgroundColor: hexColor }}
                    title={color}
                    onClick={(e) => handleColorClick(index, e)}
                  />
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-white">
              ${Number(product.price).toFixed(2)}
            </p>
            <p className="text-xs text-white/40">
              {isPreorder
                ? "Event pickup Sep 18–19"
                : stockQty > 10
                  ? "In Stock"
                  : stockQty > 0
                    ? `Only ${stockQty} left`
                    : "Out of Stock"}
            </p>
          </div>
        </div>
      </StoreLink>
    </div>
  );
}
