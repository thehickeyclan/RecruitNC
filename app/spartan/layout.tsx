import type { Metadata } from "next"
import { Barlow_Condensed, DM_Sans } from "next/font/google"
import "./spartan-campaign.css"

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barlow-spartan",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-spartan",
  display: "swap",
})

const base = process.env.NEXT_PUBLIC_APP_URL || "https://app.ncwrestlingunited.com"

export const metadata: Metadata = {
  title: "Run for NC United × Spartan Race — May 2, Fayetteville NC",
  description:
    "Support NC United athletes. Spartan Race Fayetteville, NC — May 2–3, 2026. Fund the mission. NC United is a 501(c)(3) nonprofit.",
  openGraph: {
    title: "Run for NC United × Spartan Race — May 2, Fayetteville NC",
    description: "Support NC United athletes. Spartan Race Fayetteville — May 2–3, 2026.",
    url: `${base}/spartan`,
    siteName: "NC United / RecruitNC",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: `${base}/spartan`,
  },
}

export default function SpartanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${barlow.variable} ${dmSans.variable} min-h-screen bg-[#0A0A0A] font-sans text-white antialiased`}
      style={{ fontFamily: "var(--font-dm-spartan), system-ui, sans-serif" }}
    >
      {children}
    </div>
  )
}
