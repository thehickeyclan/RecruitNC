import { RefreshCw } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading duplicate cleanup tool...</span>
      </div>
    </div>
  )
}
