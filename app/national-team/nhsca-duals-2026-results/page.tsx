import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { NhscaDuals2026ArchivePage } from "@/components/national-team/nhsca-duals-2026-archive"
import { hubPageClass } from "@/components/national-team/nhsca-hub-theme"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "NHSCA Duals 2026 Results | NC United",
  description: "NC United National and Select team results from NHSCA Duals 2026 in Virginia Beach.",
}

function ArchiveFallback() {
  return (
    <div className={cn(hubPageClass, "flex items-center justify-center min-h-[50vh]")}>
      <Loader2 className="h-8 w-8 animate-spin text-[#CBAF5D]" aria-label="Loading" />
    </div>
  )
}

export default function NHSCADuals2026ResultsPage() {
  return (
    <Suspense fallback={<ArchiveFallback />}>
      <NhscaDuals2026ArchivePage />
    </Suspense>
  )
}
