"use client"

import { Shield, Truck, Heart, RotateCcw } from "lucide-react"

const features = [
  {
    icon: Heart,
    title: "501(c)(3) Nonprofit",
    description: "Every purchase supports NC wrestlers",
  },
  {
    icon: Truck,
    title: "Flat Rate Shipping",
    description: "$5 shipping or free pickup at practice",
  },
  {
    icon: Shield,
    title: "Secure Checkout",
    description: "Powered by Stripe for safe payments",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "Hassle-free exchanges and returns",
  },
]

export function FeaturesSection() {
  return (
    <section className="border-t border-white/10 bg-[#0f1c2e]/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center text-center gap-3">
              <div className="rounded-xl bg-[#D3B574]/10 p-3">
                <feature.icon className="h-5 w-5 text-[#D3B574]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{feature.title}</p>
                <p className="text-xs text-white/50 mt-0.5">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
