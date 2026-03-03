"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { useCartStore, type ShippingAddress } from "@/lib/store/cart-store"
import { CheckoutProgress } from "@/components/checkout-progress"
import { OrderSummary } from "@/components/order-summary"

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

export default function ShippingPage() {
  const router = useRouter()
  const { items, setShippingAddress, shippingAddress, getTotal } = useCartStore()

  useEffect(() => {
    if (items.length === 0) return
    const total = getTotal()
    const numItems = items.reduce((sum, i) => sum + i.quantity, 0)
    trackInitiateCheckout(total.total, "USD", numItems)
  }, [items.length, getTotal])

  const [formData, setFormData] = useState<ShippingAddress>(
    shippingAddress ?? {
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
  )

  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})
  const [emailOffers, setEmailOffers] = useState(false)
  const [saveInfo, setSaveInfo] = useState(false)

  const validateField = (name: keyof ShippingAddress, value: string) => {
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
      case "address1":
      case "city":
      case "state":
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
    ;(Object.keys(formData) as (keyof ShippingAddress)[]).forEach((key) => {
      if (key !== "address2") {
        const error = validateField(key, formData[key] ?? "")
        if (error) newErrors[key] = error
      }
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setShippingAddress(formData)
    router.push("/checkout/shipping-method")
  }

  if (items.length === 0) {
    router.push("/cart")
    return null
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
        <CheckoutProgress currentStep={1} />

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 mt-8">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="address1">Address Line 1 *</Label>
                    <Input id="address1" value={formData.address1} onChange={(e) => handleChange("address1", e.target.value)} onBlur={() => handleBlur("address1")} className={errors.address1 ? "border-destructive" : ""} />
                    {errors.address1 && <p className="text-sm text-destructive mt-1">{errors.address1}</p>}
                  </div>
                  <div>
                    <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                    <Input id="address2" value={formData.address2 ?? ""} onChange={(e) => handleChange("address2", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input id="zipCode" value={formData.zipCode} onChange={(e) => handleChange("zipCode", e.target.value)} onBlur={() => handleBlur("zipCode")} maxLength={5} className={errors.zipCode ? "border-destructive" : ""} />
                      {errors.zipCode && <p className="text-sm text-destructive mt-1">{errors.zipCode}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => handlePhoneChange(e.target.value)} onBlur={() => handleBlur("phone")} placeholder="(555) 555-5555" className={errors.phone ? "border-destructive" : ""} />
                      {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="saveInfo" checked={saveInfo} onCheckedChange={(c) => setSaveInfo(c === true)} />
                    <label htmlFor="saveInfo" className="text-sm">Save this information for next time <span className="text-muted-foreground ml-1">(Create account after purchase)</span></label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => router.push("/cart")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Cart
                </Button>
                <Button type="submit" className="bg-[#003366] hover:bg-[#003366]/90 text-white">
                  Continue to Shipping Method
                </Button>
              </div>
            </form>
          </div>
          <div className="lg:sticky lg:top-4 h-fit">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  )
}
