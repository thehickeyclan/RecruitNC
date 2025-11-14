import { Loader2 } from "lucide-react"

export default function CallbackLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Completing Sign In</h1>
          <p className="mt-2 text-gray-600">Please wait while we verify your email...</p>
        </div>
      </div>
    </div>
  )
}
