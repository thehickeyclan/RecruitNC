"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

export function RedSignInButton() {
  const buttonRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // Apply styles directly to the DOM element
    if (buttonRef.current) {
      buttonRef.current.style.backgroundColor = "#c8102e"
      buttonRef.current.style.color = "white"

      // Add event listeners for hover
      buttonRef.current.addEventListener("mouseenter", () => {
        if (buttonRef.current) {
          buttonRef.current.style.backgroundColor = "#a50d25"
        }
      })

      buttonRef.current.addEventListener("mouseleave", () => {
        if (buttonRef.current) {
          buttonRef.current.style.backgroundColor = "#c8102e"
        }
      })
    }
  }, [])

  return (
    <Link
      href="/auth/signin"
      target="_top"
      rel="noopener"
      ref={buttonRef}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 transition-colors"
    >
      Sign In
    </Link>
  )
}
