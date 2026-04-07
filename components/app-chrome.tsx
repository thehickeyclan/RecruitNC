"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ConditionalAuthGuard } from "@/components/conditional-auth-guard"
import { AIChatWidget } from "@/components/ai-chat-widget-recruitnc"

/**
 * Spartan campaign and future microsites: no portal nav/footer/chat so the page owns the full frame.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const path = pathname && pathname.length > 0 ? pathname : "/"
  const isSpartanCampaign = path === "/spartan" || path.startsWith("/spartan/")

  if (isSpartanCampaign) {
    return (
      <div id="app-content" className="relative flex min-h-screen flex-col bg-[#0A0A0A]">
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  return (
    <div id="app-content" className="relative flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
      </main>
      <Footer />
      <AIChatWidget />
    </div>
  )
}
