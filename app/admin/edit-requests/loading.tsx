import { Loader2 } from "lucide-react"

export default function EditRequestsLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading edit requests...</p>
        </div>
      </div>
    </div>
  )
}
