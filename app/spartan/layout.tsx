import type { Metadata, Viewport } from "next"
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

/** Own manifest + icons so “Add to Home Screen” uses /spartan and the campaign mark, not the main app. */
export const metadata: Metadata = {
  metadataBase: new URL(base),
  applicationName: "Team NC × Spartan",
  manifest: "/api/manifest/spartan",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Team NC × Spartan",
  },
  icons: {
    icon: [
      { url: "/images/spartan-app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/spartan-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/spartan-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  title: "Team NC × Spartan — Fayetteville May 2–3, 2026 · Race or sponsor NC wrestling",
  description:
    "Race any Spartan distance with Team NC, or sponsor a wrestler or donate to NC United — tax-deductible 501(c)(3). Fayetteville weekend May 2–3, 2026.",
  openGraph: {
    title: "Team NC × Spartan — Fayetteville 2026 · Race, sponsor, or donate",
    description:
      "Spartan weekend in Fayetteville: run with Team NC or donate — every amount from $5 helps NC wrestling through NC United.",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0a0a",
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
