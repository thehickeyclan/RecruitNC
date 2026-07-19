"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { trackInitiateCheckout } from "@/lib/meta-pixel"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StoreNavLink } from "@/components/store-nav-link"
import { useCartStore, type ShippingAddress, type ShippingMethod } from "@/lib/store/cart-store"
import { CheckoutProgress } from "@/components/checkout-progress"
import { OrderSummary } from "@/components/order-summary"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

const PICKUP_METHOD: ShippingMethod = {
  id: "pickup",
  name: "Free pickup at NC United Blue practices",
  price: 0,
  days: "Sundays at UNC",
  description: "Pick up your order at NC United Blue practices every Sunday at UNC — FREE",
}

const STANDARD_METHOD: ShippingMethod = {
  id: "standard",
  name: "Ship anywhere",
  price: 5.0,
  days: "5-7 business days",
  description: "Standard shipping via USPS or UPS — $5.00",
}

const PICKUP_ADDRESS: Pick<ShippingAddress, "address1" | "address2" | "city" | "state" | "zipCode"> = {
  address1: "NC United Blue Practice Pickup",
  address2: "Customer will pick up at practice",
  city: "Chapel Hill",
  state: "NC",
  zipCode: "27514",
}

export default function ShippingPage() {
  const { items, setShippingAddress, setShippingMethod, shippingAddress, shippingMethod, getTotal } = useCartStore()
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "ship">(
    shippingMethod && shippingMethod.id !== "pickup" ? "ship" : "pickup"
  )

  useEffect(() => {
    if (items.length === 0) return
    const total = getTotal()
    const numItems = items.reduce((sum, i) => sum + i.quantity, 0)
    trackInitiateCheckout(total.total, "USD", numItems)
  }, [items.length, getTotal])

  useEffect(() => {
    if (!shippingMethod) setShippingMethod(PICKUP_METHOD)
  }, [shippingMethod, setShippingMethod])

  const [formData, setFormData] = useState<ShippingAddress>(() => {
    const blankAddress = {
      firstName: "",
      lastName: "",
      email: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
    }
    if (!shippingAddress) return blankAddress
    if (shippingMethod?.id !== "pickup" && shippingAddress.address1 === PICKUP_ADDRESS.address1) {
      return {
        ...shippingAddress,
        address1: "",
        address2: "",
        city: "",
        state: "",
        zipCode: "",
      }
    }
    return shippingAddress
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})
  const [emailOffers, setEmailOffers] = useState(false)
  const [saveInfo, setSaveInfo] = useState(false)

  const validateField = (name: keyof ShippingAddress, value: string, mode: "pickup" | "ship" = fulfillmentType) => {
    switch (name) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Invalid email address"
      case "zipCode":
        return /^\d{5}$/.test(value) ? "" : "ZIP code must be 5 digits"
      case "phone": {
        const digits = value.replace(/\D/g, "")
        const formatted = /^\(\d{3}\) \d{3}-\d{4}$/.test(value.trim())
        return digits.length === 10 || formatted ? "" : "Invalid phone number"
      }
      case "firstName":
      case "lastName":
        return value.trim() ? "" : "This field is required"
      case "address1":
      case "city":
      case "state":
        if (mode === "pickup") return ""
        return value.trim() ? "" : "This field is required"
      default:
        return ""
    }
  }

  const handleBlur = (name: keyof ShippingAddress) => {
    const error = validateField(name, formData[name] ?? "")
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const handleChange = (name: keyof ShippingAddress, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handlePhoneChange = (value: string) => {
    handleChange("phone", formatPhoneNumber(value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {}
    const requiredFields: (keyof ShippingAddress)[] =
      fulfillmentType === "pickup"
        ? ["firstName", "lastName", "email", "phone"]
        : ["firstName", "lastName", "email", "address1", "city", "state", "zipCode", "phone"]

    requiredFields.forEach((key) => {
      const error = validateField(key, formData[key] ?? "", fulfillmentType)
      if (error) newErrors[key] = error
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (fulfillmentType === "pickup") {
      setShippingAddress({
        ...formData,
        ...PICKUP_ADDRESS,
      })
      setShippingMethod(PICKUP_METHOD)
      window.location.href = "/checkout/payment"
      return
    }

    setShippingAddress(formData)
    window.location.href = "/checkout/shipping-method"
  }

  if (items.length === 0) {
    window.location.href = "/cart"
    return null
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
        <CheckoutProgress currentStep={1} />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-[#003366]/15 bg-[#003366]/5 p-4">
                    <Label className="mb-3 block text-base font-semibold">How do you want to get your order?</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFulfillmentType("pickup")
                          setShippingMethod(PICKUP_METHOD)
                          setErrors({})
                        }}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          fulfillmentType === "pickup"
                            ? "border-green-500 bg-green-50 text-green-950"
                            : "border-border bg-background hover:bg-secondary/50"
                        }`}
                      >
                        <div className="font-semibold">Pickup at practice</div>
                        <div className="mt-1 text-sm text-muted-foreground">Fastest checkout. No shipping address required.</div>
                        <div className="mt-2 text-sm font-semibold text-green-700">FREE</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFulfillmentType("ship")
                          setShippingMethod(STANDARD_METHOD)
                          if (formData.address1 === PICKUP_ADDRESS.address1) {
                            setFormData((prev) => ({
                              ...prev,
                              address1: "",
                              address2: "",
                              city: "",
                              state: "",
                              zipCode: "",
                            }))
                          }
                          setErrors({})
                        }}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          fulfillmentType === "ship"
                            ? "border-[#003366] bg-[#003366]/5"
                            : "border-border bg-background hover:bg-secondary/50"
                        }`}
                      >
                        <div className="font-semibold">Ship it to me</div>
                        <div className="mt-1 text-sm text-muted-foreground">Enter a shipping address and choose shipping next.</div>
                        <div className="mt-2 text-sm font-semibold">$5 standard</div>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} onBlur={() => handleBlur("firstName")} className={errors.firstName ? "border-destructive" : ""} />
                      {errors.firstName && <p className="text-sm text-destructive mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} onBlur={() => handleBlur("lastName")} className={errors.lastName ? "border-destructive" : ""} />
                      {errors.lastName && <p className="text-sm text-destructive mt-1">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="offers" checked={emailOffers} onCheckedChange={(c) => setEmailOffers(c === true)} />
                    <label htmlFor="offers" className="text-sm">Email me with news and offers</label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{fulfillmentType === "pickup" ? "Pickup Contact" : "Shipping Address"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fulfillmentType === "pickup" && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      We only need your contact info for pickup orders. Your receipt will say pickup at NC United Blue practice.
                    </div>
                  )}
                  {fulfillmentType === "ship" && (
                    <>
                      <div>
                        <Label htmlFor="address1">Address Line 1 *</Label>
                        <Input id="address1" value={formData.address1} onChange={(e) => handleChange("address1", e.target.value)} onBlur={() => handleBlur("address1")} className={errors.address1 ? "border-destructive" : ""} />
                        {errors.address1 && <p className="text-sm text-destructive mt-1">{errors.address1}</p>}
                      </div>
                      <div>
                        <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                        <Input id="address2" value={formData.address2 ?? ""} onChange={(e) => handleChange("address2", e.target.value)} />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input id="city" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} onBlur={() => handleBlur("city")} className={errors.city ? "border-destructive" : ""} />
                          {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                            <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="zipCode">ZIP Code *</Label>
                        <Input id="zipCode" value={formData.zipCode} onChange={(e) => handleChange("zipCode", e.target.value)} onBlur={() => handleBlur("zipCode")} maxLength={5} className={errors.zipCode ? "border-destructive" : ""} />
                        {errors.zipCode && <p className="text-sm text-destructive mt-1">{errors.zipCode}</p>}
                      </div>
                    </>
                  )}
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => handlePhoneChange(e.target.value)} onBlur={() => handleBlur("phone")} placeholder="(555) 555-5555" className={errors.phone ? "border-destructive" : ""} />
                    {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="saveInfo" checked={saveInfo} onCheckedChange={(c) => setSaveInfo(c === true)} />
                    <label htmlFor="saveInfo" className="text-sm">Save this information for next time <span className="text-muted-foreground ml-1">(Create account after purchase)</span></label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => window.location.href = "/cart"}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cart
                </Button>
                <Button type="submit" className="hidden bg-[#003366] text-white hover:bg-[#003366]/90 sm:inline-flex">
                  {fulfillmentType === "pickup" ? "Continue to Payment" : "Continue to Shipping Method"}
                </Button>
              </div>
            </form>
          </div>
          <div className="lg:sticky lg:top-4 h-fit">
            <OrderSummary />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-2xl shadow-black/20 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
        <Button
          type="button"
          onClick={() => {
            const form = document.querySelector("form")
            form?.requestSubmit()
          }}
          className="w-full bg-[#003366] text-white hover:bg-[#003366]/90"
          size="lg"
        >
          {fulfillmentType === "pickup" ? "Continue to Payment" : "Continue to Shipping Method"}
        </Button>
      </div>
    </div>
  )
}
