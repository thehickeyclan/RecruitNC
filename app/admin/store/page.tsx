"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Package, Ticket, ArrowRight, ArrowLeft, DollarSign } from "lucide-react"
import { HardLink } from "@/components/hard-link"

const STORE_GREEN = "#1a5f4a"

const sections = [
  {
    href: "/admin/orders",
    title: "Orders",
    description: "Order history, fulfillment, and customer details. All revenue (store, national team, drop-in) appears here.",
    icon: ShoppingBag,
  },
  {
    href: "/admin/orders/payouts",
    title: "Payouts",
    description: "Stripe payouts report. Amount, destination bank, arrive-by date, and status — same as Stripe Dashboard.",
    icon: DollarSign,
  },
  {
    href: "/admin/products",
    title: "Products",
    description: "Manage products, variants, images, and inventory. Includes national_team products for revenue reporting.",
    icon: Package,
  },
  {
    href: "/admin/promo-codes",
    title: "Promo codes",
    description: "Store discount codes for cart and checkout. Create and manage percentage, fixed, or free-shipping promos.",
    icon: Ticket,
  },
]

export default function AdminStoreHubPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin"><ArrowLeft className="h-4 w-4" /></HardLink>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#003366]">Store</h1>
            <p className="text-gray-600 mt-1">Orders, products, and promo codes. All Stripe purchases are recorded here for revenue by product.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(({ href, title, description, icon: Icon }) => (
            <HardLink key={href} href={href} className="block w-full text-left">
              <Card className="border-t-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer h-full" style={{ borderTopColor: STORE_GREEN }}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-lg p-3" style={{ backgroundColor: `${STORE_GREEN}18` }}>
                    <Icon className="h-6 w-6" style={{ color: STORE_GREEN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center justify-between gap-2">
                      {title}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription className="mt-1">{description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </HardLink>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <HardLink href="/store" className="text-[#1a5f4a] hover:underline font-medium">
            View public Store →
          </HardLink>
        </p>
      </div>
    </div>
  )
}
