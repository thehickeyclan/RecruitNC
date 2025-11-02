"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

// Import icons
import { Mail } from "lucide-react"

export function SocialLoginButtons() {
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      // Note: Social login functionality may need to be implemented in the main auth context
      console.log("Social login not yet implemented in main auth context")
    } catch (error) {
      console.error("Error signing in with Google:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-100"
        onClick={handleGoogleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        <span>Continue with Google</span>
      </Button>
    </div>
  )
}
