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
    name: "Pickup at blue practice",
    price: 0,
    days: "Next practice",
    description: "Pick up your order at the next team practice — $0",
  },
  {
    id: "pickup-states",
    name: "Pickup at States (Suite 109)",
    price: 0,
    days: "During States",
    description: "Pick up at Suite 109, Greensboro Coliseum during NCHSAA State tournament — $0",
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
        <CheckoutProgress currentStep={2} />

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 mt-8">
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Select Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod} className="space-y-4">
                  {SHIPPING_OPTIONS.map((option) => {
                    const isPickupAtPractice = option.id === "pickup"
                    const isPickupAtStates = option.id === "pickup-states"
                    const isAnyPickup = isPickupAtPractice || isPickupAtStates
                    const borderClass = isPickupAtPractice
                      ? "border-green-500 bg-green-50/50"
                      : isPickupAtStates
                        ? "border-blue-500 bg-blue-50/50"
                        : ""

                    return (
                      <div
                        key={option.id}
                        className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-secondary/50 transition-colors ${borderClass}`}
                      >
                        <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              {isAnyPickup && (
                                <MapPin className={`w-4 h-4 ${isPickupAtStates ? "text-blue-600" : "text-green-600"}`} />
                              )}
                              <div>
                                <p className="font-semibold">{option.name}</p>
                                <p className="text-sm text-muted-foreground">{option.days}</p>
                              </div>
                            </div>
                            <p className="font-semibold">
                              {isAnyPickup ? (
                                <span className={isPickupAtStates ? "text-blue-600" : "text-green-600"}>FREE</span>
                              ) : (
                                `$${option.price.toFixed(2)}`
                              )}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>

                {selectedMethod === "pickup" && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700 font-medium">
                      Your order will be ready for pickup at the next team practice. You&apos;ll receive a confirmation email with details.
                    </p>
                  </div>
                )}
                {selectedMethod === "pickup-states" && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700 font-medium">
                      Your order will be ready for pickup at Suite 109, Greensboro Coliseum during the NCHSAA State tournament. You&apos;ll receive a confirmation email with details.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => window.location.href = "/checkout/shipping"}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shipping
              </Button>
              <Button onClick={handleContinue} className="bg-[#003366] hover:bg-[#003366]/90 text-white">
                Continue to Payment
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
