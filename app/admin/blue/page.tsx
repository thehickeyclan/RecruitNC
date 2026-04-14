"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Link2, BarChart3, Ticket, Image, FileText, ArrowRight, Trophy } from "lucide-react"

const NAVY = "#03154C"
const GOLD = "#D3B574"

const sections = [
  {
    href: "/admin/blue/subscriptions",
    title: "Subscription management",
    description: "Billing, renewals, Stripe sync, and registration pipeline.",
    icon: CreditCard,
  },
  {
    href: "/admin/blue/invites",
    title: "Invites",
    description: "Create invite links and send invite emails to parents.",
    icon: Link2,
  },
  {
    href: "/admin/blue/reports",
    title: "Reports",
    description: "Trends, by class, MRR, and membership analytics.",
    icon: BarChart3,
  },
  {
    href: "/admin/blue/promo-codes",
    title: "Scholarship / promo codes",
    description: "Create 100% off, 20% family discount, or other codes. Applied at checkout.",
    icon: Ticket,
  },
  {
    href: "/admin/blue/images",
    title: "Page images",
    description: "Upload and edit banner and content images for the Blue page.",
    icon: Image,
  },
  {
    href: "/admin/blue/interest",
    title: "Interest forms",
    description: "State qualifier interest. Create invites and track invited / enrolled.",
    icon: FileText,
  },
  {
    href: "/admin/blue/members-2026",
    title: "Blue members – 2026 NCHSAA",
    description: "List of Blue members (active or athlete flag) and their 2026 state placement.",
    icon: Trophy,
  },
]

export default function AdminBlueHubPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#13294B]">Blue Program</h1>
          <p className="text-gray-600 mt-1">Memberships, invites, reports, and content.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(({ href, title, description, icon: Icon }) => (
            <button key={href} type="button" onClick={() => { window.location.href = href }} className="w-full text-left">
              <Card className="border-t-4 border-t-[#03154C] shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="rounded-lg bg-[#03154C]/10 p-3">
                    <Icon className="h-6 w-6 text-[#03154C]" />
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
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/blue" className="text-[#03154C] hover:underline font-medium">
            View public Blue page →
          </Link>
        </p>
      </div>
    </div>
  )
}
