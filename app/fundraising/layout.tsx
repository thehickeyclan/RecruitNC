import type { ReactNode } from "react"
import { Barlow_Condensed, DM_Sans } from "next/font/google"

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-fundraising-display",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fundraising-body",
  display: "swap",
})

export default function FundraisingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${barlow.variable} ${dmSans.variable}`} style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}>
      {children}
    </div>
  )
}
