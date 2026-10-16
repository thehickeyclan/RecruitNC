import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import "@/app/globals.css"
// Brand colours on the pre-launch brand addresses only (scripts/gen-recruit-brand-css.mjs).
import "@/app/recruit-brand.css"
import "@/app/force-styles.css"
import "@/app/flip-card.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { WelcomeModal } from "@/components/welcome-modal"
import { AppChrome } from "@/components/app-chrome"
import { LayoutOptionalClients } from "@/components/layout-optional-clients"
import { BulletproofInternalLinks } from "@/components/bulletproof-internal-links"
import { Analytics } from "@vercel/analytics/next"
import { UserActivityTracker } from "@/components/user-activity-tracker"
import { ContactTapTracker } from "@/components/contact-tap-tracker"

const defaultTitle = "NC United Wrestling"
const defaultDescription =
  "North Carolina wrestling news, rankings, events, athlete profiles, clubs, and college recruiting coverage."
const defaultShareImage = "/images/nc-united-logo-official.png"

export const metadata: Metadata = {
  metadataBase: new URL("https://app.ncwrestlingunited.com"),
  title: {
    default: defaultTitle,
    template: "%s | NC United Wrestling",
  },
  description: defaultDescription,
  manifest: "/api/manifest",
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: "https://app.ncwrestlingunited.com",
    siteName: "NC United Wrestling",
    type: "website",
    images: [
      {
        url: defaultShareImage,
        width: 512,
        height: 512,
        alt: "NC United Wrestling logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultShareImage],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NC Wrestling",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  generator: "v0.app",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#003366",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ scrollBehavior: "smooth" }} suppressHydrationWarning>
      <head>
        {/*
          Apple PWA / home-screen title & capable flags come from export const metadata.appleWebApp
          so /spartan can override. Keep generic mobile cap flags here. */}
        {/*
          recruit.wrestlingguild.com (data-host=guild) and recruitwrestlers.com (data-host=national): mark the page before it paints, so its blue (app/recruit-brand.css) and
          its frame (components/app-chrome.tsx) show from the first frame with no NC United gold, and
          the tab says RecruitWrestlers. Same pages, two addresses; this is the one switch.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=location.hostname,b=h==='recruit.wrestlingguild.com'?'guild':/(^|\\.)recruitwrestlers\\.com$/.test(h)?'national':null;if(!b)return;var name=b==='guild'?'Guild Recruiting':'RecruitWrestlers';var d=document.documentElement;d.setAttribute('data-host',b);var fix=function(){var t=document.title;if(t&&t.indexOf('NC United Wrestling')>-1)document.title=t.replace(/ \\| RecruitNC(?= \\|)/g,'').replace(/NC United Wrestling/g,name)};fix();new MutationObserver(fix).observe(document.documentElement,{subtree:true,childList:true});var n=0,iv=setInterval(function(){fix();if(++n>40)clearInterval(iv)},250)}catch(e){}})();`,
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#003366" />
        <meta name="msapplication-tap-highlight" content="no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var origin = typeof window !== 'undefined' && window.location && window.location.origin;
  if (!origin) return;
  function sameOrigin(url) {
    try { return new URL(url, origin).origin === origin; } catch (e) { return false; }
  }
  function onClick(e) {
    var el = e.target && e.target.nodeType === 1 ? e.target : e.target && e.target.parentElement;
    var a = el && el.closest && el.closest('a');
    if (!a || !a.href) return;
    if (a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (!sameOrigin(a.href)) return;
    e.preventDefault();
    e.stopPropagation();
    window.location.href = a.href;
  }
  function onSubmit(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var method = ((form.getAttribute('method') || '').toLowerCase());
    if (method !== 'get') return;
    var action = (form.getAttribute('action') || '').trim() || (window.location && window.location.pathname) || '/';
    if (!sameOrigin(action)) return;
    e.preventDefault();
    e.stopPropagation();
    var url = new URL(form.action || action, origin);
    var fd = new FormData(form);
    fd.forEach(function(v, k) { url.searchParams.set(k, String(v)); });
    window.location.href = url.toString();
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
})();
`,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-background font-sans antialiased"
        suppressHydrationWarning
        style={{
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "auto",
          overflowX: "hidden",
          overflowY: "auto",
          maxWidth: "100vw",
          scrollBehavior: "smooth",
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <BulletproofInternalLinks />
            <UserActivityTracker />
            <LayoutOptionalClients />
            <AppChrome>{children}</AppChrome>
            {/* Coach Call/Text/Email taps on a wrestler, the closest signal of off-site contact. */}
            <ContactTapTracker />
            {/* Renders nothing without ?welcome=<role>, set at verification and at coach sign-up. */}
            <WelcomeModal />
            <Toaster />
            <Analytics />
          </AuthProvider>
        </ThemeProvider>
        {/* Disabled: was likely canceling nav to /store. Re-enable if app is embedded in iframe and needs it. */}
        {/* <Script src="https://ncwrestlingunited.com/wp-content/plugins/advanced-iframe/js/ai_external.js" strategy="afterInteractive" /> */}
      </body>
    </html>
  )
}
