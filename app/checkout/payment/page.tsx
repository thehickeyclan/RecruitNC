"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Lock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StoreNavLink } from "@/components/store-nav-link"
import { useCartStore } from "@/lib/store/cart-store"
import { CheckoutProgress } from "@/components/checkout-progress"
import { OrderSummary } from "@/components/order-summary"
import { useToast } from "@/hooks/use-toast"
import { createPaymentIntent } from "@/app/actions/stripe"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { CheckoutForm } from "@/components/checkout-form"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PaymentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { items, shippingAddress, shippingMethod, getTotal, promoCode, promoDiscount, applyPromoCode } = useCartStore()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const total = getTotal()

  const [urlPromoCode, setUrlPromoCode] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("promoCode") || params.get("promo") || null
      setUrlPromoCode(code)
    }
  }, [])

  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 20
    const checkStore = () => {
      attempts++
      const currentPromoCode = promoCode || getTotal().promoCode
      const currentDiscount = getTotal().discount
      try {
        const stored = localStorage.getItem("nc-united-cart")
        const parsed = stored ? JSON.parse(stored) : null
        const storedPromoCode = parsed?.state?.promoCode
        if (currentPromoCode || storedPromoCode || items.length > 0) {
          setIsHydrated(true)
          return
        }
      } catch {
        // ignore
      }
      if (attempts < maxAttempts) setTimeout(checkStore, 50)
      else setIsHydrated(true)
    }
    setTimeout(checkStore, 50)
  }, [promoCode, items.length, getTotal])

  useEffect(() => {
    if (!isHydrated) return

    if (items.length === 0) {
      router.push("/cart")
      return
    }
    if (!shippingAddress) {
      router.push("/checkout/shipping")
      return
    }
    if (!shippingAddress.address1?.trim()) {
      toast({
        title: "Address Required",
        description: "Shipping address is missing. Please complete your shipping information.",
        variant: "destructive",
      })
      router.push("/checkout/shipping")
      return
    }
    if (!shippingMethod) {
      router.push("/checkout/shipping-method")
      return
    }

    const initializeCheckout = async () => {
      let totalState = getTotal()
      let finalPromoCode: string | null = null
      if (urlPromoCode) finalPromoCode = urlPromoCode
      else if (promoCode) finalPromoCode = promoCode
      else if (totalState.promoCode) finalPromoCode = totalState.promoCode
      else {
        try {
          const storedCart = localStorage.getItem("nc-united-cart")
          if (storedCart) {
            const parsed = JSON.parse(storedCart)
            if (parsed?.state?.promoCode) {
              finalPromoCode = parsed.state.promoCode
              if (totalState.discount > 0 || promoDiscount > 0) {
                await applyPromoCode(finalPromoCode)
                totalState = getTotal()
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if ((totalState.discount > 0 || promoDiscount > 0) && !finalPromoCode) {
        toast({
          title: "Promo Code Required",
          description: "Please return to cart and re-apply your promo code.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/cart")
        return
      }

      if (totalState.discount > 0 && !finalPromoCode) {
        toast({
          title: "Promo Code Error",
          description: `Your discount of $${totalState.discount.toFixed(2)} requires a promo code. Please return to cart and re-apply it.`,
          variant: "destructive",
        })
        router.push("/cart")
        return
      }

      if (finalPromoCode && totalState.discount === 0) {
        const success = await applyPromoCode(finalPromoCode)
        if (success) totalState = getTotal()
        else {
          toast({ title: "Promo Code Error", description: "Failed to apply promo code. Please try again.", variant: "destructive" })
          router.push("/cart")
          return
        }
      }

      finalPromoCode = promoCode || totalState.promoCode || urlPromoCode || finalPromoCode
      if (urlPromoCode && !promoCode && !totalState.promoCode && totalState.discount === 0) {
        const success = await applyPromoCode(urlPromoCode)
        if (success) {
          totalState = getTotal()
          finalPromoCode = urlPromoCode
        }
      }

      if (totalState.discount > 0 && !finalPromoCode) {
        toast({
          title: "Promo Code Required",
          description: `Your discount of $${totalState.discount.toFixed(2)} requires a promo code. Please return to cart and re-apply it.`,
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/cart")
        return
      }
      if (promoDiscount > 0 && !finalPromoCode) {
        toast({
          title: "Promo Code Required",
          description: "A discount is applied but the promo code is missing. Please return to cart and re-apply it.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/cart")
        return
      }
      if ((totalState.discount > 0 || promoDiscount > 0) && !finalPromoCode) {
        toast({
          title: "Cannot Proceed",
          description: "Promo code is required. Please return to cart and re-apply your promo code.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/cart")
        return
      }

      const result = await createPaymentIntent({
        customerEmail: shippingAddress.email,
        customerName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address1: shippingAddress.address1,
          address2: shippingAddress.address2 ?? "",
          address: shippingAddress.address1,
          apartment: shippingAddress.address2 ?? "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: (shippingAddress as Record<string, string>).country ?? "US",
          phone: shippingAddress.phone,
          email: shippingAddress.email,
        },
        shippingMethod: {
          name: shippingMethod.name,
          price: shippingMethod.price,
          estimatedDays: shippingMethod.days,
        },
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant,
          image: item.image,
        })),
        subtotal: totalState.subtotal,
        shipping: totalState.shipping ?? shippingMethod.price ?? 0,
        tax: totalState.tax,
        discount: totalState.discount,
        total: totalState.total,
        promoCode: finalPromoCode ?? undefined,
      })

      if (result.success && "isFree" in result && result.isFree && result.orderId) {
        router.push(`/checkout/confirmation?order_id=${result.orderId}`)
        return
      }

      if (result.success && "clientSecret" in result && result.clientSecret) {
        setClientSecret(result.clientSecret)
      } else {
        toast({
          title: "Checkout Error",
          description: "error" in result ? result.error : "Failed to initialize checkout. Please try again.",
          variant: "destructive",
        })
      }
      setIsLoading(false)
    }

    initializeCheckout()
  }, [isHydrated, items, shippingAddress, shippingMethod, router, getTotal, toast, promoCode, promoDiscount, applyPromoCode, urlPromoCode])

  if (!shippingAddress || !shippingMethod) return null

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="container mx-auto px-4 pb-4 pt-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">&gt;</span>
          <StoreNavLink className="hover:text-foreground cursor-pointer">Store</StoreNavLink>
          <span className="mx-2">&gt;</span>
          <span className="text-foreground font-medium">Checkout</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-8">
        <CheckoutProgress currentStep={3} />

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 mt-8">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]" />
                  </div>
                ) : clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: { theme: "stripe" },
                    }}
                  >
                    <div className="bg-[#003366]/5 p-4 rounded-lg border border-[#003366]/10 mb-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total to Pay</p>
                      <p className="text-3xl font-bold text-[#003366]">${total.total.toFixed(2)}</p>
                    </div>
                    <CheckoutForm clientSecret={clientSecret} total={total.total} />
                  </Elements>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Failed to load checkout. Please try again.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center flex-wrap">
                  <Lock className="w-4 h-4" />
                  <span>Secure checkout</span>
                  <span className="mx-2">•</span>
                  <Shield className="w-4 h-4" />
                  <span>SSL Secure</span>
                  <span className="mx-2">•</span>
                  <span>PCI Compliant</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/checkout/shipping-method")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shipping Method
              </Button>
            </div>
          </div>

          <div className="lg:sticky lg:top-4 h-fit">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  )
}
