import { RefreshCw } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-white text-lg">Loading Unified Media Manager...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
