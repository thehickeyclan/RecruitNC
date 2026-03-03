"use client"

import { useEffect } from "react"

/** Redirect legacy URL to tabbed NCHSAA page. */
export default function NCHSAABracketsRedirect() {
  useEffect(() => {
    window.location.href = "/admin/nchsaa"
  }, [])
  return (
    <div className="container mx-auto px-4 py-8 text-center text-slate-600">
      Redirecting to NCHSAA…
    </div>
  )
}
