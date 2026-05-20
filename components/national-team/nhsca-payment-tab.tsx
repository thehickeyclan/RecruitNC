"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    name: "Van Transportation",
    description: "Round-trip from Raleigh",
    priceInCents: 0,
  },
  hotel: {
    id: "nhsca-2026-hotel",
    name: "Hotel",
    description: "Shared hotel accommodations",
    priceInCents: 0,
  },
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function NhscaPaymentTab() {
  const [mode, setMode] = useState<"bundle" | "individual">("bundle")
  const [cart, setCart] = useState<CartItem[]>([])
  const [includeRegistration, setIncludeRegistration] = useState(false)
  const [singletQty, setSingletQty] = useState(0)
  const [singletSize, setSingletSize] = useState("")
  const [shortsSize, setShortsSize] = useState("")
  const [shortSleeveSize, setShortSleeveSize] = useState("")
  const [longSleeveSize, setLongSleeveSize] = useState("")
  const [wantTransport, setWantTransport] = useState(false)
  const [wantHotel, setWantHotel] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [athleteName, setAthleteName] = useState("")
  const [team, setTeam] = useState<"national" | "select">("national")
  const [cancelled, setCancelled] = useState(false)
  const searchParams = useSearchParams()
  
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    const status = searchParams.get("status")
    if (status === "cancelled") {
      setCancelled(true)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/nhsca-duals/payments")
        if (res.ok) {
          const data = await res.json()
          setOrders(data.payments || [])
        }
      } catch (err) {
        console.error("Failed to load orders:", err)
      } finally {
        setLoadingOrders(false)
      }
    }
    loadOrders()
  }, [])

  useEffect(() => {
    const newCart: CartItem[] = []
    
    if (mode === "bundle") {
      newCart.push({
        productId: PRODUCTS.bundle.id,
        name: PRODUCTS.bundle.name,
        priceInCents: PRODUCTS.bundle.priceInCents,
        quantity: 1,
      })
    } else {
      if (includeRegistration) {
        newCart.push({
          productId: PRODUCTS.registration.id,
          name: PRODUCTS.registration.name,
          priceInCents: PRODUCTS.registration.priceInCents,
          quantity: 1,
        })
      }
      
      if (singletQty > 0 && singletSize) {
        newCart.push({
          productId: PRODUCTS.singlet.id,
          name: PRODUCTS.singlet.name,
          priceInCents: PRODUCTS.singlet.priceInCents,
          quantity: singletQty,
          size: singletSize,
        })
      }
      
      if (shortsSize && shortsSize !== "none" && shortsSize !== "") {
        newCart.push({
          productId: PRODUCTS.shorts.id,
          name: PRODUCTS.shorts.name,
          priceInCents: PRODUCTS.shorts.priceInCents,
          quantity: 1,
          size: shortsSize,
        })
      }
      if (shortSleeveSize && shortSleeveSize !== "none" && shortSleeveSize !== "") {
        newCart.push({
          productId: PRODUCTS.shortSleeve.id,
          name: PRODUCTS.shortSleeve.name,
          priceInCents: PRODUCTS.shortSleeve.priceInCents,
          quantity: 1,
          size: shortSleeveSize,
        })
      }
      if (longSleeveSize && longSleeveSize !== "none" && longSleeveSize !== "") {
        newCart.push({
          productId: PRODUCTS.longSleeve.id,
          name: PRODUCTS.longSleeve.name,
          priceInCents: PRODUCTS.longSleeve.priceInCents,
          quantity: 1,
          size: longSleeveSize,
        })
      }

      if (wantTransport && PRODUCTS.transport.priceInCents > 0) {
        newCart.push({
          productId: PRODUCTS.transport.id,
          name: PRODUCTS.transport.name,
          priceInCents: PRODUCTS.transport.priceInCents,
          quantity: 1,
        })
      }
      if (wantHotel && PRODUCTS.hotel.priceInCents > 0) {
        newCart.push({
          productId: PRODUCTS.hotel.id,
          name: PRODUCTS.hotel.name,
          priceInCents: PRODUCTS.hotel.priceInCents,
          quantity: 1,
        })
      }
    }
    
    setCart(newCart)
  }, [mode, singletQty, singletSize, shortsSize, shortSleeveSize, longSleeveSize, includeRegistration, wantTransport, wantHotel])

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

  const paidPayments = orders.filter(p => p.status === "paid")

  return (
    <Tabs defaultValue="place-order" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-[#0a2040] border border-[#1a3a5c] rounded-xl p-1">
        <TabsTrigger value="place-order" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
          Place an Order
        </TabsTrigger>
        <TabsTrigger value="past-orders" className="data-[state=active]:bg-[#c9a227] data-[state=active]:text-[#002147]">
          Past Orders ({orders.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="place-order" className="mt-6 space-y-6">
        {cancelled && (
          <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Payment was cancelled. You can try again below.</span>
          </div>
        )}

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

        <Card className="bg-[#0a1628] border-[#1a3a5c]">
          <CardHeader>
            <CardTitle className="text-white">Team Package Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode("bundle")}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  mode === "bundle"
                    ? "border-[#c9a227] bg-[#c9a227]/10"
                    : "border-[#1a3a5c] bg-[#0d1f38] hover:border-[#c9a227]"
                }`}
              >
                <Package className="h-6 w-6 mx-auto mb-2 text-[#c9a227]" />
                <div className="font-semibold text-white">Bundle</div>
                <div className="text-xs text-white/60">{formatPrice(PRODUCTS.bundle.priceInCents)}</div>
              </button>
              <button
                onClick={() => setMode("individual")}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  mode === "individual"
                    ? "border-[#c9a227] bg-[#c9a227]/10"
                    : "border-[#1a3a5c] bg-[#0d1f38] hover:border-[#c9a227]"
                }`}
              >
                <Shirt className="h-6 w-6 mx-auto mb-2 text-[#c9a227]" />
                <div className="font-semibold text-white">Individual</div>
                <div className="text-xs text-white/60">Pick items</div>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-white/80">Wrestler Name</Label>
                <Input
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  placeholder="Full name"
                  className="bg-[#0d1f38] border-[#1a3a5c] text-white placeholder:text-white/40 mt-1"
                />
              </div>

              <div>
                <Label className="text-white/80">Team</Label>
                <Select value={team} onValueChange={(v: any) => setTeam(v)}>
                  <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National Team</SelectItem>
                    <SelectItem value="select">Select Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {mode === "bundle" && (
                <div className="space-y-2 text-sm text-white/60">
                  <p>✓ Tournament Registration</p>
                  <p>✓ 2 Singlets</p>
                  <p>✓ Shorts & Apparel</p>
                </div>
              )}

              {mode === "individual" && (
                <>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={includeRegistration}
                      onCheckedChange={(e) => setIncludeRegistration(!!e)}
                      className="border-[#1a3a5c]"
                    />
                    <span className="text-white/80">{PRODUCTS.registration.name} - {formatPrice(PRODUCTS.registration.priceInCents)}</span>
                  </div>

                  <div className="space-y-2 border-t border-[#1a3a5c] pt-3">
                    <div>
                      <Label className="text-white/80 text-xs">Singlets</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          value={singletQty}
                          onChange={(e) => setSingletQty(parseInt(e.target.value) || 0)}
                          className="w-16 bg-[#0d1f38] border-[#1a3a5c] text-white"
                          placeholder="Qty"
                        />
                        <Select value={singletSize} onValueChange={setSingletSize} disabled={singletQty === 0}>
                          <SelectTrigger className="flex-1 bg-[#0d1f38] border-[#1a3a5c] text-white">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/80 text-xs">Shorts Size</Label>
                      <Select value={shortsSize} onValueChange={setShortsSize}>
                        <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white mt-1">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white/80 text-xs">Short Sleeve Size</Label>
                      <Select value={shortSleeveSize} onValueChange={setShortSleeveSize}>
                        <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white mt-1">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white/80 text-xs">Long Sleeve Size</Label>
                      <Select value={longSleeveSize} onValueChange={setLongSleeveSize}>
                        <SelectTrigger className="bg-[#0d1f38] border-[#1a3a5c] text-white mt-1">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-[#1a3a5c] pt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={wantTransport}
                        onCheckedChange={(e) => setWantTransport(!!e)}
                        className="border-[#1a3a5c]"
                      />
                      <span className="text-white/80 text-sm">{PRODUCTS.transport.name} - TBD</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={wantHotel}
                        onCheckedChange={(e) => setWantHotel(!!e)}
                        className="border-[#1a3a5c]"
                      />
                      <span className="text-white/80 text-sm">{PRODUCTS.hotel.name} - TBD</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}

            <div className="pt-4 border-t border-[#1a3a5c]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white/80">Total</span>
                <span className="text-2xl font-bold text-[#c9a227]">{formatPrice(total)}</span>
              </div>
              <Button
                onClick={handleCheckout}
                disabled={submitting || total === 0}
                className="w-full bg-[#c9a227] hover:bg-[#d4bc6a] text-[#002147] font-bold text-lg h-12"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Proceed to Checkout
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="past-orders" className="mt-6">
        <Card className="bg-[#0a1628] border-[#1a3a5c]">
          <CardHeader>
            <CardTitle className="text-white">Past Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="text-white/60">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-white/60">No orders yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a3a5c]">
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">Athlete</th>
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">Email</th>
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">School</th>
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">Reg</th>
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">Apparel</th>
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">Total</th>
                      <th className="text-left py-3 px-2 text-white/80 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order: any) => (
                      <tr key={order.id} className="border-b border-[#0d1f38] hover:bg-[#0d1f38]">
                        <td className="py-3 px-2 text-white font-semibold whitespace-nowrap">
                          {order.athlete_name || order.name || "—"}
                        </td>
                        <td className="py-3 px-2 text-white/75 text-xs">
                          {order.parent_email || "—"}
                        </td>
                        <td className="py-3 px-2 text-white/75 text-xs">
                          {order.school || "—"}
                        </td>
                        <td className="py-3 px-2 text-white/75">
                          ${(order.reg_fee_cents || 0) / 100}
                        </td>
                        <td className="py-3 px-2 text-white/75">
                          ${(order.apparel_fee_cents || 0) / 100}
                        </td>
                        <td className="py-3 px-2 font-semibold text-[#c9a227]">
                          ${(order.amount_cents || 0) / 100}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            order.status === 'paid'
                              ? 'bg-green-500/20 text-green-300'
                              : order.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
