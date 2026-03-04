import type React from "react"
import Script from "next/script"
import "@/app/globals.css"
import "@/app/force-styles.css"
import "@/app/flip-card.css"
import { Footer } from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/navbar"
import { AuthProvider } from "@/contexts/auth-context"
import { ConditionalAuthGuard } from "@/components/conditional-auth-guard"
import { LayoutOptionalClients } from "@/components/layout-optional-clients"
import { BulletproofInternalLinks } from "@/components/bulletproof-internal-links"
import { AIChatWidget } from "@/components/ai-chat-widget-recruitnc"
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: "NC Wrestling Commits | Prospect Rankings",
  description: "North Carolina wrestling prospect rankings and college commitments",
  manifest: "/api/manifest",
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
    generator: 'v0.app'
}

export const viewport = {
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NC Wrestling" />
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
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            <BulletproofInternalLinks />
            <LayoutOptionalClients />
            <div id="app-content" className="relative flex flex-col min-h-screen pt-4">
              <Navbar />
              <main className="flex-1">
              <ConditionalAuthGuard>{children}</ConditionalAuthGuard>
            </main>
              <Footer />
            </div>
            <Toaster />
            <AIChatWidget />
            <Analytics />
          </AuthProvider>
        </ThemeProvider>
        {/* Disabled: was likely canceling nav to /store. Re-enable if app is embedded in iframe and needs it. */}
        {/* <Script src="https://ncwrestlingunited.com/wp-content/plugins/advanced-iframe/js/ai_external.js" strategy="afterInteractive" /> */}
      </body>
    </html>
  )
}
