import { Suspense } from "react"
import EnhancedLogoManager from "@/components/enhanced-logo-manager"

export default function EnhancedLogoManagerPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Loading enhanced logo manager...</div>}>
        <EnhancedLogoManager />
      </Suspense>
    </div>
  )
}
