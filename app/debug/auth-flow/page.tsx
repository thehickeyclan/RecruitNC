"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AuthFlowDebug() {
  const { user, session, loading, isAdmin, checkAdminStatusManually } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    setDebugInfo({
      user: user ? { id: user.id, email: user.email } : null,
      session: session ? { expires_at: session.expires_at } : null,
      loading,
      isAdmin,
      timestamp: new Date().toISOString(),
    })
  }, [user, session, loading, isAdmin])

  const handleCheckAdmin = async () => {
    if (user) {
      const result = await checkAdminStatusManually()
      console.log("Manual admin check result:", result)
      setDebugInfo((prev) => ({ ...prev, manualAdminCheck: result }))
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Auth Flow Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Current Auth State:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>

            {user && <Button onClick={handleCheckAdmin}>Check Admin Status Manually</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
