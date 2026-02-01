"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

export function GoldSignUpButton() {
  const buttonRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    // Apply styles directly to the DOM element
    if (buttonRef.current) {
      buttonRef.current.style.backgroundColor = "#f1c400"
      buttonRef.current.style.color = "#0a1e50"

      // Add event listeners for hover
      buttonRef.current.addEventListener("mouseenter", () => {
        if (buttonRef.current) {
          buttonRef.current.style.backgroundColor = "#d9ae00"
        }
      })

      buttonRef.current.addEventListener("mouseleave", () => {
        if (buttonRef.current) {
          buttonRef.current.style.backgroundColor = "#f1c400"
        }
      })
    }
  }, [])

  return (
    <Link
      href="/auth/signup"
      target="_top"
      rel="noopener"
      ref={buttonRef}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 transition-colors"
    >
      Sign Up
    </Link>
  )
}
