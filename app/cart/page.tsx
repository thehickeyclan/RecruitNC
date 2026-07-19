"use client"

import { useState } from "react"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag, Lock, Shield, Truck, RotateCcw, ArrowLeft, Check, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StoreNavLink } from "@/components/store-nav-link"
import { StoreCatalogImage, STORE_CATALOG_FRAME_CLASS } from "@/components/store-catalog-image"
import { useCartStore, getMaxQuantityForItem } from "@/lib/store/cart-store"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CartPage() {
  const { toast } = useToast()
  const {
    items,
    removeItem,
    updateQuantity,
    applyPromoCode,
    removePromoCode,
    promoCode,
    promoDiscount,
    getSubtotal,
    getShippingCost,
    getTax,
    getTotal,
  } = useCartStore()

  const [promoInput, setPromoInput] = useState("")
  const [promoError, setPromoError] = useState("")
  const [itemToRemove, setItemToRemove] = useState<{ id: number; variant: { color: string; size: string } } | null>(null)

  const subtotal = getSubtotal()
  const shipping = getShippingCost()
  const tax = getTax()
  const totalBreakdown = getTotal()
  const total = (totalBreakdown as { total: number }).total

  const handleQuantityChange = (
    id: number,
    variant: { color: string; size: string },
    newQuantity: number,
    item: { sku?: string | null; name?: string }
  ) => {
    const max = getMaxQuantityForItem(item)
    if (newQuantity >= 1 && newQuantity <= max) {
      updateQuantity(id, variant, newQuantity)
    }
  }

  const handleRemoveItem = () => {
    if (itemToRemove) {
      removeItem(itemToRemove.id, itemToRemove.variant)
      toast({
        title: "Item removed",
        description: "The item has been removed from your cart.",
      })
      setItemToRemove(null)
    }
  }

  const handleApplyPromo = async () => {
    setPromoError("")
    const success = await applyPromoCode(promoInput)
    if (success) {
      toast({
        title: "Promo code applied!",
        description: `You saved $${promoDiscount.toFixed(2)}`,
      })
      setPromoInput("")
    } else {
      setPromoError("Invalid or expired promo code")
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A1628]">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-[#0f1c2e] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-white/30" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-white/50 mb-8">Add some items to get started!</p>
            <Button asChild className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold px-8">
              <StoreNavLink className="cursor-pointer">Browse Products</StoreNavLink>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const checkoutUrl = promoCode
    ? `/checkout/shipping?promoCode=${encodeURIComponent(promoCode)}`
    : "/checkout/shipping"

  return (
    <div className="min-h-screen bg-[#0A1628] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0A1628]/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#D3B574] flex items-center justify-center">
                <span className="text-[#0A1628] font-black text-sm">NC</span>
              </div>
              <span className="font-bold text-white tracking-tight">NC UNITED STORE</span>
            </Link>
          </div>
          <nav className="text-sm text-white/40 mt-2">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <StoreNavLink className="hover:text-white/70 transition-colors cursor-pointer">Store</StoreNavLink>
            <span className="mx-2">/</span>
            <span className="text-[#D3B574] font-medium">Cart</span>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Info banners */}
        <div className="mb-8 space-y-3">
          <div className="p-4 bg-[#D3B574]/5 border border-[#D3B574]/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-[#D3B574] mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-[#D3B574] mb-0.5 text-sm">Support North Carolina Wrestling</h3>
                <p className="text-xs text-white/50">
                  NC United is a 501(c)(3) nonprofit (EIN: 99-3757238). Every purchase directly supports NC wrestling programs.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-white/60 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-white mb-0.5 text-sm">Shipping Options</h3>
                <p className="text-xs text-white/50">
                  <strong className="text-white/70">$5 flat rate</strong> anywhere, or <strong className="text-white/70">free pickup</strong> at NC United Blue practices (Sundays at UNC)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cart heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Shopping Cart</h1>
          <StoreNavLink className="text-sm text-[#D3B574] hover:text-[#c4a665] flex items-center gap-1 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </StoreNavLink>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Cart items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.id}-${item.variant.color}-${item.variant.size}`} className="rounded-xl bg-[#0f1c2e] border border-white/5 p-4">
                <div className="flex gap-4">
                  <div className={`relative w-24 h-24 shrink-0 ${STORE_CATALOG_FRAME_CLASS}`}>
                    <StoreCatalogImage
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      product={{ name: item.name }}
                      sizes="96px"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-base mb-1">{item.name}</h3>
                    <p className="text-sm text-white/50 mb-1">
                      {item.variant.color} / Size: {item.variant.size}
                    </p>
                    <p className="text-xs text-white/30 mb-2">SKU: {item.sku}</p>
                    <Badge
                      className={item.stock === "in-stock"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }
                    >
                      {item.stock === "in-stock" ? "In Stock" : "Low Stock"}
                    </Badge>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <div className="text-right">
                      {item.originalPrice && item.discount ? (
                        <div>
                          <p className="text-sm text-white/30 line-through">
                            ${((item.originalPrice ?? item.price) * item.quantity).toFixed(2)}
                          </p>
                          <p className="font-bold text-lg text-emerald-400">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-emerald-400 font-medium">
                            {((item.discount ?? 0) * 100).toFixed(0)}% off
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold text-lg text-white">${(item.price * item.quantity).toFixed(2)}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                        onClick={() => handleQuantityChange(item.id, item.variant, item.quantity - 1, item)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(item.id, item.variant, Number.parseInt(e.target.value, 10) || 1, item)
                        }
                        className="w-14 h-8 text-center bg-white/5 border-white/10 text-white"
                        min={1}
                        max={getMaxQuantityForItem(item)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
                        onClick={() => handleQuantityChange(item.id, item.variant, item.quantity + 1, item)}
                        disabled={item.quantity >= getMaxQuantityForItem(item)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => setItemToRemove({ id: item.id, variant: item.variant })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:sticky lg:top-4 h-fit">
            <div className="rounded-xl bg-[#0f1c2e] border border-white/10 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span className="text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Shipping</span>
                  <span className="text-white">
                    {shipping === null ? (
                      <span className="text-white/40 text-xs">At checkout</span>
                    ) : shipping === 0 ? (
                      <span className="text-emerald-400 font-semibold">FREE</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Estimated Tax</span>
                  <span className="text-white">${tax.toFixed(2)}</span>
                </div>
                {promoCode && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({promoCode})</span>
                    <span>-${promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex justify-between text-lg font-bold text-white">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Promo code */}
              <div className="mt-4 space-y-2">
                {promoCode ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {promoCode} - Save ${promoDiscount.toFixed(2)}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={removePromoCode}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Promo code"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value)
                          setPromoError("")
                        }}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                      <Button
                        onClick={handleApplyPromo}
                        variant="outline"
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10 shrink-0"
                      >
                        Apply
                      </Button>
                    </div>
                    {promoError && <p className="text-sm text-red-400">{promoError}</p>}
                  </>
                )}
              </div>

              <Button
                className="w-full mt-6 bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-bold"
                size="lg"
                onClick={() => {
                  window.location.href = checkoutUrl
                }}
              >
                <Lock className="w-4 h-4 mr-2" />
                Proceed to Checkout
              </Button>

              <div className="flex items-center justify-around pt-6 mt-6 border-t border-white/10 text-xs text-white/40">
                <div className="flex flex-col items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Secure</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  <span>Returns</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  <span>Fast Ship</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!itemToRemove} onOpenChange={() => setItemToRemove(null)}>
        <AlertDialogContent className="bg-[#0f1c2e] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove item from cart?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">Are you sure you want to remove this item?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveItem}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A1628]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-white/40">Cart total</p>
            <p className="text-lg font-black text-white">${total.toFixed(2)}</p>
          </div>
          <Button
            className="shrink-0 bg-[#D3B574] px-5 font-bold text-[#0A1628] hover:bg-[#c4a665]"
            onClick={() => {
              window.location.href = checkoutUrl
            }}
          >
            <Lock className="mr-2 h-4 w-4" />
            Checkout
          </Button>
        </div>
      </div>
    </div>
  )
}
