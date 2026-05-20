"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, Check, Package, Shirt, Bus, AlertCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

const SIZES = ["YS", "YM", "YL", "AS", "AM", "AL", "AXL", "A2XL"]

interface CartItem {
  productId: string
  name: string
  priceInCents: number
  quantity: number
  size?: string
}

const PRODUCTS = {
  bundle: {
    id: "nhsca-2026-team-package",
    name: "NHSCA Team Package",
    description: "Tournament Registration & Team Fee, 2 NC United Singlets, Team Shorts, Short Sleeve Tee, Long Sleeve Tee",
    priceInCents: 25000,
  },
  registration: {
    id: "nhsca-2026-registration",
    name: "Tournament Registration & Team Fee",
    description: "Entry fee for NHSCA National Duals 2026",
    priceInCents: 7500,
  },
  singlet: {
    id: "nhsca-2026-singlet",
    name: "NC United Singlet",
    description: "Official NC United competition singlet",
    priceInCents: 7500,
  },
  apparelPackage: {
    id: "nhsca-2026-apparel-package",
    name: "NC United Apparel Package",
    description: "Team Shorts + Short Sleeve Tee + Long Sleeve Tee",
    priceInCents: 11000,
  },
  shorts: {
    id: "nhsca-2026-shorts",
    name: "Team Shorts",
    priceInCents: 4000,
  },
  shortSleeve: {
    id: "nhsca-2026-short-sleeve",
    name: "Short Sleeve Tee",
    priceInCents: 3000,
  },
  longSleeve: {
    id: "nhsca-2026-long-sleeve",
    name: "Long Sleeve Tee",
    priceInCents: 4000,
  },
  transport: {
    id: "nhsca-2026-transport",
    name: "Transportation / Van Fee",
    description: "Round-trip from Raleigh",
    priceInCents: 0, // TBD
  },
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function NhscaPaymentTab() {
  const searchParams = useSearchParams()
  const success = searchParams.get("success") === "1"
  const cancelled = searchParams.get("cancelled") === "1"

  const [mode, setMode] = useState<"bundle" | "individual">("bundle")
  const [cart, setCart] = useState<CartItem[]>([])
  const [singletQty, setSingletQty] = useState(1)
  const [singletSize, setSingletSize] = useState("")
const [shortsSize, setShortsSize] = useState("none")
const [shortSleeveSize, setShortSleeveSize] = useState("none")
const [longSleeveSize, setLongSleeveSize] = useState("none")
  const [wantTransport, setWantTransport] = useState(false)
  const [athleteName, setAthleteName] = useState("")
  const [team, setTeam] = useState<"national" | "select">("national")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [existingPayments, setExistingPayments] = useState<Array<{ id: string; status: string; amount_cents: number; created_at: string; items: unknown[] }>>([])
  const [loadingPayments, setLoadingPayments] = useState(true)

  // Load existing payments
  useEffect(() => {
    async function loadPayments() {
      try {
        const res = await fetch("/api/nhsca-duals/payments")
        if (res.ok) {
          const data = await res.json()
          setExistingPayments(data.payments || [])
        }
      } catch {
        // ignore
      } finally {
        setLoadingPayments(false)
      }
    }
    loadPayments()
  }, [success])

  // Calculate cart based on mode
  useEffect(() => {
    const newCart: CartItem[] = []
    
    if (mode === "bundle") {
      newCart.push({
        productId: PRODUCTS.bundle.id,
        name: PRODUCTS.bundle.name,
        priceInCents: PRODUCTS.bundle.priceInCents,
        quantity: 1,
        size: singletSize,
      })
    } else {
      // Individual mode - registration is required
      newCart.push({
        productId: PRODUCTS.registration.id,
        name: PRODUCTS.registration.name,
        priceInCents: PRODUCTS.registration.priceInCents,
        quantity: 1,
      })
      
      // Add singlets
      if (singletQty > 0 && singletSize) {
        newCart.push({
          productId: PRODUCTS.singlet.id,
          name: PRODUCTS.singlet.name,
          priceInCents: PRODUCTS.singlet.priceInCents,
          quantity: singletQty,
          size: singletSize,
        })
      }
      
// Add individual apparel items
if (shortsSize && shortsSize !== "none") {
        newCart.push({
          productId: PRODUCTS.shorts.id,
          name: PRODUCTS.shorts.name,
          priceInCents: PRODUCTS.shorts.priceInCents,
          quantity: 1,
          size: shortsSize,
})
}
if (shortSleeveSize && shortSleeveSize !== "none") {
        newCart.push({
          productId: PRODUCTS.shortSleeve.id,
          name: PRODUCTS.shortSleeve.name,
          priceInCents: PRODUCTS.shortSleeve.priceInCents,
          quantity: 1,
          size: shortSleeveSize,
})
}
if (longSleeveSize && longSleeveSize !== "none") {
        newCart.push({
          productId: PRODUCTS.longSleeve.id,
          name: PRODUCTS.longSleeve.name,
          priceInCents: PRODUCTS.longSleeve.priceInCents,
          quantity: 1,
          size: longSleeveSize,
        })
      }
    }
    
    setCart(newCart)
  }, [mode, singletQty, singletSize, shortsSize, shortSleeveSize, longSleeveSize])

  const total = cart.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0)

  const handleCheckout = async () => {
    setError("")
    if (!athleteName.trim()) {
      setError("Please enter the wrestler's name.")
      return
    }
    if (cart.length === 0) {
      setError("Please select items to purchase.")
      return
    }
    
    setSubmitting(true)
    try {
      const res = await fetch("/api/nhsca-duals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
          })),
          athleteName: athleteName.trim(),
          team,
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError(data.error || "Checkout failed. Please try again.")
      }
    } catch {
      setError("Could not start checkout. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Show success state
  if (success) {
    return (
      <Card className="bg-[#0d1f38] border-[#1a3a5c]">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Payment Successful!</h3>
          <p className="text-white/70">Thank you for your payment. You will receive a confirmation email shortly.</p>
        </CardContent>
      </Card>
    )
  }

  // Show existing paid payments
  const paidPayments = existingPayments.filter(p => p.status === "paid")

  return (
    <div className="space-y-6">
      {cancelled && (
        <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Payment was cancelled. You can try again below.</span>
        </div>
      )}

      {/* Existing payments */}
      {paidPayments.length > 0 && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Check className="h-5 w-5 text-green-500" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paidPayments.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm">
                <span className="text-white/80">{new Date(p.created_at).toLocaleDateString()}</span>
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50">
                  {formatPrice(p.amount_cents)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode("bundle")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            mode === "bundle"
              ? "border-[#c9a227] bg-[#c9a227]/10"
              : "border-[#1a3a5c] bg-[#0d1f38] hover:border-[#2a4a6c]"
          }`}
        >
          <Package className={`h-6 w-6 mb-2 ${mode === "bundle" ? "text-[#c9a227]" : "text-white/60"}`} />
          <div className={`font-bold ${mode === "bundle" ? "text-[#c9a227]" : "text-white"}`}>Team Package</div>
          <div className="text-sm text-white/60">$250 — Best Value</div>
        </button>
        <button
          onClick={() => setMode("individual")}
          className={`p-4 rounded-xl border-2 transition-all text-left ${
            mode === "individual"
              ? "border-[#c9a227] bg-[#c9a227]/10"
              : "border-[#1a3a5c] bg-[#0d1f38] hover:border-[#2a4a6c]"
          }`}
        >
          <Shirt className={`h-6 w-6 mb-2 ${mode === "individual" ? "text-[#c9a227]" : "text-white/60"}`} />
          <div className={`font-bold ${mode === "individual" ? "text-[#c9a227]" : "text-white"}`}>Individual Items</div>
          <div className="text-sm text-white/60">Build your own</div>
        </button>
      </div>

      <Card className="bg-[#0d1f38] border-[#1a3a5c]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#c9a227]" />
            {mode === "bundle" ? "NHSCA Team Package" : "Individual Items"}
          </CardTitle>
          <CardDescription className="text-white/60">
            {mode === "bundle" 
              ? "Registration + 2 Singlets + Full Apparel Set"
              : "Select the items you need"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wrestler info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white/80">Wrestler Name *</Label>
              <Input
                value={athleteName}
                onChange={e => setAthleteName(e.target.value)}
                placeholder="First Last"
                className="bg-[#0a1628] border-[#1a3a5c] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Team</Label>
              <Select value={team} onValueChange={(v) => setTeam(v as "national" | "select")}>
                <SelectTrigger className="bg-[#0a1628] border-[#1a3a5c] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National Team</SelectItem>
                  <SelectItem value="select">Select Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "bundle" ? (
            /* Bundle mode - just need size */
            <div className="space-y-4">
              <div className="p-4 bg-[#0a1628] rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">NHSCA Team Package</h4>
                    <p className="text-sm text-white/60 mt-1">
                      Tournament Registration & Team Fee, 2 NC United Singlets, Team Shorts, Short Sleeve Tee, Long Sleeve Tee
                    </p>
                  </div>
                  <div className="text-[#c9a227] font-bold text-lg">$250</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 text-sm">Singlet Size *</Label>
                  <Select value={singletSize} onValueChange={setSingletSize}>
                    <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            /* Individual mode */
            <div className="space-y-4">
              {/* Registration - required */}
              <div className="p-4 bg-[#0a1628] rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-white">Tournament Registration & Team Fee</h4>
                  <p className="text-xs text-white/50">Required</p>
                </div>
                <div className="text-[#c9a227] font-bold">$75</div>
              </div>

              {/* Singlet */}
              <div className="p-4 bg-[#0a1628] rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white">NC United Singlet</h4>
                    <p className="text-xs text-white/50">$75 each</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white/80 text-xs">Quantity</Label>
                    <Select value={String(singletQty)} onValueChange={v => setSingletQty(Number(v))}>
                      <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/80 text-xs">Size</Label>
                    <Select value={singletSize} onValueChange={setSingletSize} disabled={singletQty === 0}>
                      <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Individual apparel */}
              <div className="p-4 bg-[#0a1628] rounded-lg space-y-3">
                <h4 className="font-semibold text-white mb-2">Apparel (Optional)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white/80 text-xs">Shorts — $40</Label>
                    <Select value={shortsSize} onValueChange={setShortsSize}>
                      <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white text-sm">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {SIZES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/80 text-xs">Short Sleeve — $30</Label>
                    <Select value={shortSleeveSize} onValueChange={setShortSleeveSize}>
                      <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white text-sm">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {SIZES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/80 text-xs">Long Sleeve — $40</Label>
                    <Select value={longSleeveSize} onValueChange={setLongSleeveSize}>
                      <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white text-sm">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {SIZES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transportation - TBD */}
          <div className="p-4 bg-[#0a1628] rounded-lg">
            <div className="flex items-start gap-3">
              <Checkbox
                id="transport"
                checked={wantTransport}
                onCheckedChange={(c) => setWantTransport(!!c)}
                className="mt-1 border-[#1a3a5c] data-[state=checked]:bg-[#c9a227] data-[state=checked]:border-[#c9a227]"
              />
              <div>
                <Label htmlFor="transport" className="text-white font-semibold cursor-pointer">
                  Transportation / Van Fee
                </Label>
                <p className="text-xs text-white/50">Round-trip from Raleigh — Price TBD</p>
                {wantTransport && (
                  <p className="text-xs text-[#c9a227] mt-1">We&apos;ll contact you with pricing details.</p>
                )}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="border-t border-[#1a3a5c] pt-4">
            <div className="space-y-2 mb-4">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white/80">
                    {item.name} {item.quantity > 1 && `x${item.quantity}`} {item.size && `(${item.size})`}
                  </span>
                  <span className="text-white">{formatPrice(item.priceInCents * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-[#c9a227]">{formatPrice(total)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={submitting || total === 0 || (mode === "bundle" && !singletSize)}
            className="w-full bg-[#c9a227] text-[#002147] hover:bg-[#d4b84a] font-bold h-12"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Checkout — {formatPrice(total)}
              </>
            )}
          </Button>

          <p className="text-xs text-white/40 text-center">
            Hotel is handled separately and not included in checkout.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
