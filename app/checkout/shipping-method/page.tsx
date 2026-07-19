"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Truck, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { StoreNavLink } from "@/components/store-nav-link"
import { useCartStore, type ShippingMethod } from "@/lib/store/cart-store"
import { CheckoutProgress } from "@/components/checkout-progress"
import { OrderSummary } from "@/components/order-summary"

// Order/webhook safe: Stripe metadata stores { n: name, p: price }. Webhook and admin use
// .includes("pickup"|"practice"|"suite") for logic — no exact string match. DB stores name as-is.
const SHIPPING_OPTIONS: ShippingMethod[] = [
  {
    id: "standard",
    name: "Ship anywhere",
    price: 5.0,
    days: "5-7 business days",
    description: "Standard shipping via USPS or UPS — $5.00",
  },
  {
    id: "pickup",
    name: "Free pickup at NC United Blue practices",
    price: 0,
    days: "Sundays at UNC",
    description: "Pick up your order at NC United Blue practices every Sunday at UNC — FREE",
  },
]

export default function ShippingMethodPage() {
  const router = useRouter()
  const { items, shippingAddress, setShippingMethod, shippingMethod } = useCartStore()
  const [selectedMethod, setSelectedMethod] = useState<string>(shippingMethod?.id ?? "standard")

  useEffect(() => {
    if (items.length === 0) {
      window.location.href = "/cart"
    } else if (!shippingAddress) {
      window.location.href = "/checkout/shipping"
    }
  }, [items, shippingAddress, router])

  if (!shippingAddress) return null

  const handleContinue = () => {
    const method = SHIPPING_OPTIONS.find((m) => m.id === selectedMethod)
    if (method) {
      setShippingMethod(method)
      window.location.href = "/checkout/payment"
    }
  }

  return (
    <div className="min-h-[100dvh] bg-secondary/30">
      <div className="container mx-auto px-4 pb-4 pt-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">&gt;</span>
          <StoreNavLink className="hover:text-foreground cursor-pointer">Store</StoreNavLink>
          <span className="mx-2">&gt;</span>
          <span className="text-foreground font-medium">Checkout</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 lg:pb-8">
        <CheckoutProgress currentStep={2} />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Select Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-4">
                  {SHIPPING_OPTIONS.map((option) => {
                    const isPickup = option.id === "pickup"
                    const borderClass = isPickup ? "border-green-500 bg-green-50/50" : ""

                    return (
                      <div
                        key={option.id}
                        className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-secondary/50 ${borderClass}`}
                      >
                        <RadioGroupItem value={option.id} id={option.id} className="mt-1 shrink-0" />
                        <Label htmlFor={option.id} className="min-w-0 flex-1 cursor-pointer">
                          <div className="mb-1 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-2">
                              {isPickup && <MapPin className="w-4 h-4 text-green-600" />}
                              <div className="min-w-0">
                                <p className="font-semibold">{option.name}</p>
                                <p className="text-sm text-muted-foreground">{option.days}</p>
                              </div>
                            </div>
                            <p className="shrink-0 font-semibold sm:text-right">
                              {isPickup ? <span className="text-green-600">FREE</span> : `$${option.price.toFixed(2)}`}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>

                {selectedMethod === "pickup" && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700 font-medium">
                      Your order will be ready for pickup at NC United Blue practices every Sunday at UNC. You&apos;ll receive a confirmation email with details.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => window.location.href = "/checkout/shipping"}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shipping
              </Button>
              <Button onClick={handleContinue} className="hidden bg-[#003366] text-white hover:bg-[#003366]/90 sm:inline-flex">
                Continue to Payment
              </Button>
            </div>
          </div>

          <div className="lg:sticky lg:top-4 h-fit">
            <OrderSummary />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-2xl shadow-black/20 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
        <Button onClick={handleContinue} className="w-full bg-[#003366] text-white hover:bg-[#003366]/90" size="lg">
          Continue to Payment
        </Button>
      </div>
    </div>
  )
}
