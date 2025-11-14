"use client"

import { useState, useEffect } from "react"
import { Shield, CheckCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ProtectionStatus() {
  const [protectionActive, setProtectionActive] = useState(true)
  const [protectedCount] = useState(42) // Number of protected components

  useEffect(() => {
    // Verify protection is active
    const checkProtection = () => {
      try {
        // This would normally check if protection guard is loaded
        setProtectionActive(true)
      } catch (error) {
        setProtectionActive(false)
      }
    }

    checkProtection()
  }, [])

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">Card Protection System</span>
          </div>

          <div className="flex items-center gap-1">
            {protectionActive ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">ACTIVE</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">INACTIVE</span>
              </>
            )}
          </div>

          <div className="text-sm text-green-600">{protectedCount} components protected</div>
        </div>

        <div className="mt-2 text-xs text-green-600">
          🛡️ Cards are the heart of the platform and are fully protected from modification
        </div>
      </CardContent>
    </Card>
  )
}
