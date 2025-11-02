"use client"

import { useEffect, useState } from "react"

export function ForceButtonColors() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Function to apply styles to buttons
    const applyButtonStyles = () => {
      // Find all buttons in the navbar
      const navbarButtons = document.querySelectorAll('nav a[href="/auth/signin"], nav button:has-text("Sign In")')
      const signupButtons = document.querySelectorAll('nav a[href="/auth/signup"], nav button:has-text("Sign Up")')

      // Apply styles to sign in buttons
      navbarButtons.forEach((button) => {
        if (button instanceof HTMLElement) {
          button.style.backgroundColor = "#c8102e"
          button.style.color = "white"

          // Store original background color
          const originalBg = button.style.backgroundColor

          // Add hover event
          button.addEventListener("mouseenter", () => {
            button.style.backgroundColor = "#a50d25"
          })

          // Add mouseout event
          button.addEventListener("mouseleave", () => {
            button.style.backgroundColor = originalBg
          })
        }
      })

      // Apply styles to sign up buttons
      signupButtons.forEach((button) => {
        if (button instanceof HTMLElement) {
          button.style.backgroundColor = "#f1c400"
          button.style.color = "#0a1e50"

          // Store original background color
          const originalBg = button.style.backgroundColor

          // Add hover event
          button.addEventListener("mouseenter", () => {
            button.style.backgroundColor = "#d9ae00"
          })

          // Add mouseout event
          button.addEventListener("mouseleave", () => {
            button.style.backgroundColor = originalBg
          })
        }
      })
    }

    // Apply styles immediately
    applyButtonStyles()

    // Set up a mutation observer to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      applyButtonStyles()
    })

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // Clean up
    return () => {
      observer.disconnect()
    }
  }, [isMounted])

  return null
}
