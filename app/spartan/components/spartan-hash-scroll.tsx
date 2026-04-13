"use client"

import { useEffect } from "react"

const CHECKOUT_ID = "spartan-checkout"

/** Ensures #spartan-checkout / legacy #donate scroll to the form (not the section header above it). */
export function SpartanHashScroll() {
  useEffect(() => {
    const scrollToCheckout = () => {
      const raw = window.location.hash.slice(1)
      if (raw !== CHECKOUT_ID && raw !== "donate") return
      const el = document.getElementById(CHECKOUT_ID)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    scrollToCheckout()
    const t1 = window.setTimeout(scrollToCheckout, 100)
    const t2 = window.setTimeout(scrollToCheckout, 400)
    window.addEventListener("hashchange", scrollToCheckout)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener("hashchange", scrollToCheckout)
    }
  }, [])

  return null
}
