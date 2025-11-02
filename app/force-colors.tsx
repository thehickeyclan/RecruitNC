"use client"

import { useEffect } from "react"

export default function ForceColors() {
  useEffect(() => {
    // Create a style element
    const style = document.createElement("style")

    // Add our CSS rules
    style.innerHTML = `
      /* Target all sign in buttons in the navbar */
      nav a[href="/auth/signin"],
      nav button:has-text("Sign In") {
        background-color: #c8102e !important;
        color: white !important;
      }
      
      nav a[href="/auth/signin"]:hover,
      nav button:has-text("Sign In"):hover {
        background-color: #a50d25 !important;
      }
      
      /* Target all sign up buttons in the navbar */
      nav a[href="/auth/signup"],
      nav button:has-text("Sign Up") {
        background-color: #f1c400 !important;
        color: #0a1e50 !important;
      }
      
      nav a[href="/auth/signup"]:hover,
      nav button:has-text("Sign Up"):hover {
        background-color: #d9ae00 !important;
      }
    `

    // Append the style element to the head
    document.head.appendChild(style)

    // Clean up function
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return null
}
