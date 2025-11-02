"use client"

import { useEffect, useState } from "react"

export function ButtonColorFix() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // Function to find and style the buttons
    const styleButtons = () => {
      // Get all buttons/links in the navigation area
      const navButtons = document.querySelectorAll(".flex.items-center.gap-4 > *")

      if (navButtons.length >= 2) {
        // The first button should be Sign In (red)
        const signInButton = navButtons[0]

        // The second button should be Sign Up (gold)
        const signUpButton = navButtons[1]

        // Style the Sign In button (RED)
        if (signInButton) {
          // Apply styles to the button and all its children
          const applyRedStyles = (element) => {
            element.style.backgroundColor = "#c8102e"
            element.style.color = "white"
            element.style.borderColor = "#c8102e"

            // Style all children too
            Array.from(element.children).forEach((child) => {
              child.style.backgroundColor = "#c8102e"
              child.style.color = "white"
              child.style.borderColor = "#c8102e"
            })
          }

          applyRedStyles(signInButton)

          // Add hover effect
          signInButton.addEventListener("mouseover", () => {
            signInButton.style.backgroundColor = "#a50d25"
            signInButton.style.borderColor = "#a50d25"

            Array.from(signInButton.children).forEach((child) => {
              child.style.backgroundColor = "#a50d25"
              child.style.borderColor = "#a50d25"
            })
          })

          signInButton.addEventListener("mouseout", () => {
            signInButton.style.backgroundColor = "#c8102e"
            signInButton.style.borderColor = "#c8102e"

            Array.from(signInButton.children).forEach((child) => {
              child.style.backgroundColor = "#c8102e"
              child.style.borderColor = "#c8102e"
            })
          })
        }

        // Style the Sign Up button (GOLD)
        if (signUpButton) {
          // Apply styles to the button and all its children
          const applyGoldStyles = (element) => {
            element.style.backgroundColor = "#f1c400"
            element.style.color = "#0a1e50"
            element.style.borderColor = "#f1c400"

            // Style all children too
            Array.from(element.children).forEach((child) => {
              child.style.backgroundColor = "#f1c400"
              child.style.color = "#0a1e50"
              child.style.borderColor = "#f1c400"
            })
          }

          applyGoldStyles(signUpButton)

          // Add hover effect
          signUpButton.addEventListener("mouseover", () => {
            signUpButton.style.backgroundColor = "#d9ae00"
            signUpButton.style.borderColor = "#d9ae00"

            Array.from(signUpButton.children).forEach((child) => {
              child.style.backgroundColor = "#d9ae00"
              child.style.borderColor = "#d9ae00"
            })
          })

          signUpButton.addEventListener("mouseout", () => {
            signUpButton.style.backgroundColor = "#f1c400"
            signUpButton.style.borderColor = "#f1c400"

            Array.from(signUpButton.children).forEach((child) => {
              child.style.backgroundColor = "#f1c400"
              child.style.borderColor = "#f1c400"
            })
          })
        }
      } else {
        // Fallback to finding by content
        document.querySelectorAll("a, button").forEach((el) => {
          const text = el.textContent?.trim().toLowerCase()

          if (text === "sign in") {
            // Style as RED
            el.style.backgroundColor = "#c8102e"
            el.style.color = "white"
            el.style.borderColor = "#c8102e"

            el.addEventListener("mouseover", () => {
              el.style.backgroundColor = "#a50d25"
              el.style.borderColor = "#a50d25"
            })

            el.addEventListener("mouseout", () => {
              el.style.backgroundColor = "#c8102e"
              el.style.borderColor = "#c8102e"
            })
          }

          if (text === "sign up") {
            // Style as GOLD
            el.style.backgroundColor = "#f1c400"
            el.style.color = "#0a1e50"
            el.style.borderColor = "#f1c400"

            el.addEventListener("mouseover", () => {
              el.style.backgroundColor = "#d9ae00"
              el.style.borderColor = "#d9ae00"
            })

            el.addEventListener("mouseout", () => {
              el.style.backgroundColor = "#f1c400"
              el.style.borderColor = "#f1c400"
            })
          }
        })
      }
    }

    // Run the function after a short delay to ensure the DOM is fully loaded
    setTimeout(styleButtons, 500)

    // Also run it when the DOM content is loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", styleButtons)
    } else {
      styleButtons()
    }

    // And run it again after a longer delay just to be sure
    setTimeout(styleButtons, 2000)

    // Run it on every route change
    const observer = new MutationObserver(() => {
      setTimeout(styleButtons, 100)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
  }, [isMounted])

  return null
}
