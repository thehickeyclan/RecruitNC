"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"

import { META_PIXEL_ID } from "@/lib/meta-pixel"

/**
 * Loads the Meta Pixel and counts a page view on every client-side navigation. Rendered only by the
 * RecruitWrestlers deployment (app/layout.tsx). No advanced matching: nothing about the visitor is
 * sent beyond what the pixel collects by itself.
 */
export function MetaPixel() {
  const pathname = usePathname()
  const first = useRef(true)

  useEffect(() => {
    // The base code counts the first page; later route changes are counted here.
    if (first.current) {
      first.current = false
      return
    }
    window.fbq?.("track", "PageView")
  }, [pathname])

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
      }}
    />
  )
}
