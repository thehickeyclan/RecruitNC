import type { ReactNode } from "react"

export default function AdminAthletesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-dark-page admin-layout min-h-screen bg-[#061224]">
      {children}
    </div>
  )
}
