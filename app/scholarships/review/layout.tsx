import type { ReactNode } from "react"

import { redirectIfSignedOut } from "@/lib/server-auth-redirect"

export default async function ScholarshipReviewLayout({ children }: { children: ReactNode }) {
  await redirectIfSignedOut("/scholarships/review")
  return (
    <div className="min-h-screen bg-[#061224] text-white" style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}>
      {children}
    </div>
  )
}
