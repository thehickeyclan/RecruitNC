"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Redirect legacy URL to tabbed NCHSAA page. */
export default function NCHSAABracketsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/admin/nchsaa")
  }, [router])
  return (
    <div className="container mx-auto px-4 py-8 text-center text-slate-600">
      Redirecting to NCHSAA…
    </div>
  )
}
