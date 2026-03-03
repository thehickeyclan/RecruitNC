"use client"

import { useState } from "react"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag, Lock, Shield, Truck, RotateCcw, ArrowLeft, Check, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StoreNavLink } from "@/components/store-nav-link"
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
      <div className="min-h-screen bg-secondary/30">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some items to get started!</p>
            <Button asChild className="bg-[#003366] hover:bg-[#003366]/90 text-white">
              <StoreNavLink className="cursor-pointer">Browse Products</StoreNavLink>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#003366] rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xl">NC</span>
            </div>
            <h1 className="text-2xl font-bold text-[#003366]">NC UNITED STORE</h1>
          </div>
          <nav className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">&gt;</span>
            <StoreNavLink className="hover:text-foreground cursor-pointer">Store</StoreNavLink>
            <span className="mx-2">&gt;</span>
            <span className="text-foreground font-medium">Cart</span>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="p-4 bg-[#003366]/10 border border-[#003366]/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-[#003366] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#003366] mb-1">Support North Carolina Wrestling</h3>
                <p className="text-sm text-muted-foreground">
                  NC United is a 501(c)(3) nonprofit organization (EIN: 99-3757238). Every purchase directly supports
                  growing North Carolina Wrestling programs and helps athletes across the state.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Shipping Options</h3>
                <ul className="text-sm text-blue-800 space-y-0.5 list-none">
                  <li><strong>Ship anywhere:</strong> $5.00 flat rate</li>
                  <li><strong>Free pickup at States</strong> (Suite 109, Greensboro Coliseum)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
          <StoreNavLink className="text-sm text-[#003366] hover:underline flex items-center gap-1 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </StoreNavLink>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={`${item.id}-${item.variant.color}-${item.variant.size}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-md"
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        {item.variant.color} / Size: {item.variant.size}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">SKU: {item.sku}</p>
                      <Badge
                        variant={item.stock === "in-stock" ? "default" : "secondary"}
                        className={item.stock === "in-stock" ? "bg-green-500" : "bg-orange-500"}
                      >
                        {item.stock === "in-stock" ? "In Stock" : "Low Stock"}
                      </Badge>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <div className="text-right">
                        {item.originalPrice && item.discount ? (
                          <div>
                            <p className="text-sm text-muted-foreground line-through">
                              ${((item.originalPrice ?? item.price) * item.quantity).toFixed(2)}
                            </p>
                            <p className="font-semibold text-lg text-green-600">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              {((item.discount ?? 0) * 100).toFixed(0)}% off
                            </p>
                          </div>
                        ) : (
                          <p className="font-semibold text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => handleQuantityChange(item.id, item.variant, item.quantity - 1, item)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(item.id, item.variant, Number.parseInt(e.target.value, 10) || 1, item)
                          }
                          className="w-16 h-8 text-center"
                          min={1}
                          max={getMaxQuantityForItem(item)}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent"
                          onClick={() => handleQuantityChange(item.id, item.variant, item.quantity + 1, item)}
                          disabled={item.quantity >= getMaxQuantityForItem(item)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setItemToRemove({ id: item.id, variant: item.variant })}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:sticky lg:top-4 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {shipping === null ? (
                        <span className="text-muted-foreground text-xs">Calculated at checkout</span>
                      ) : shipping === 0 ? (
                        <span className="text-green-600 font-semibold">FREE</span>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  {promoCode && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({promoCode})</span>
                      <span>-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {promoCode ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 text-green-700">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Code {promoCode} applied - Save ${promoDiscount.toFixed(2)}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={removePromoCode}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value)
                            setPromoError("")
                          }}
                        />
                        <Button onClick={handleApplyPromo} variant="outline">
                          Apply
                        </Button>
                      </div>
                      {promoError && <p className="text-sm text-destructive">{promoError}</p>}
                    </>
                  )}
                </div>

                <Button
                  className="w-full bg-[#003366] hover:bg-[#003366]/90 text-white"
                  size="lg"
                  onClick={() => {
                    const checkoutUrl = promoCode
                      ? `/checkout/shipping?promoCode=${encodeURIComponent(promoCode)}`
                      : "/checkout/shipping"
                    window.location.href = checkoutUrl
                  }}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Proceed to Checkout
                </Button>

                <div className="flex items-center justify-around pt-4 border-t text-xs text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <Shield className="w-5 h-5" />
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <RotateCcw className="w-5 h-5" />
                    <span>Free Returns</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-5 h-5" />
                    <span>Fast Shipping</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={!!itemToRemove} onOpenChange={() => setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item from cart?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this item from your cart?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
