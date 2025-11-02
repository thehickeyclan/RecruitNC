import { RefreshCw } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nc-blue via-slate-900 to-nc-red">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-nc-gold mx-auto mb-4" />
            <span className="text-white text-lg">Loading Logo Manager Pro...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
