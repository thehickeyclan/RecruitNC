import { RefreshCw } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <span className="text-lg text-gray-600">Loading logo consistency checker...</span>
        </div>
      </div>
    </div>
  )
}
