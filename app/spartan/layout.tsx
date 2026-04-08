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
  title: "Race with Team NC × Spartan — Super 10K, May 3 · Fayetteville, NC",
  description:
    "Come race with Team NC — 10K team race (Super 10K) Sunday, May 3, 2026 · Fayetteville. Tax-deductible to NC United — 501(c)(3).",
  openGraph: {
    title: "Race with Team NC × Spartan — Super 10K, May 3 · Fayetteville, NC",
    description:
      "Team NC 10K team race · Super 10K · May 3 · Fayetteville. Fund NC wrestling through NC United.",
    url: `${base}/spartan`,
    siteName: "NC United / RecruitNC",
    locale: "en_US",
    type: "website",
    images: [{ url: `${base}/images/spartan-race-banner.png`, width: 1200, height: 400, alt: "Spartan Race × NC United — Fayetteville" }],
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
