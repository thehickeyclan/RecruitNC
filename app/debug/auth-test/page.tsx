"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthTestPage() {
  const [clientAuth, setClientAuth] = useState({
    loading: true,
    authenticated: false,
    userEmail: null,
    userId: null,
    error: null,
  })
  const [serverAuth, setServerAuth] = useState(null)
  const [claimResult, setClaimResult] = useState(null)

  const supabase = createClient()

  useEffect(() => {
    checkClientAuth()
  }, [])

  const checkClientAuth = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      setClientAuth({
        loading: false,
        authenticated: !!user,
        userEmail: user?.email || null,
        userId: user?.id || null,
        error: error?.message || null,
      })
    } catch (error) {
      console.error("Client auth error:", error)
      setClientAuth({
        loading: false,
        authenticated: false,
        userEmail: null,
        userId: null,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  const checkServerAuth = async () => {
    try {
      const response = await fetch("/api/debug/auth-status")
      const data = await response.json()
      setServerAuth(data)
    } catch (error) {
      console.error("Server auth check error:", error)
      setServerAuth({ error: "Failed to check server auth" })
    }
  }

  const testClaimAPI = async () => {
    try {
      // Use Liam Hickey's ID for testing
      const response = await fetch("/api/athletes/claim-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ athleteId: 1 }), // Assuming Liam's ID is 1
      })

      const data = await response.json()
      setClaimResult({
        status: response.status,
        data,
        success: response.ok,
      })
    } catch (error) {
      console.error("Claim API test error:", error)
      setClaimResult({
        status: 500,
        data: { error: error instanceof Error ? error.message : "Unknown error" },
        success: false,
      })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Authentication Debug</h1>

      {/* Client-side Auth */}
      <Card>
        <CardHeader>
          <CardTitle>Client-side Auth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <strong>Loading:</strong> {clientAuth.loading ? "Yes" : "No"}
          </p>
          <p>
            <strong>Authenticated:</strong> {clientAuth.authenticated ? "Yes" : "No"}
          </p>
          <p>
            <strong>User Email:</strong> {clientAuth.userEmail || "None"}
          </p>
          <p>
            <strong>User ID:</strong> {clientAuth.userId || "None"}
          </p>
          {clientAuth.error && (
            <p className="text-red-600">
              <strong>Error:</strong> {clientAuth.error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Server-side Auth */}
      <Card>
        <CardHeader>
          <CardTitle>Server-side Auth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkServerAuth}>Check Server Auth</Button>
          {serverAuth && (
            <div className="space-y-2">
              <p>
                <strong>User:</strong> {serverAuth.user || "None"}
              </p>
              <p>
                <strong>Session:</strong> {serverAuth.session || "None"}
              </p>
              <p>
                <strong>Access Token:</strong> {serverAuth.accessToken || "Missing"}
              </p>
              {serverAuth.userError && (
                <p className="text-red-600">
                  <strong>User Error:</strong> {serverAuth.userError}
                </p>
              )}
              {serverAuth.sessionError && (
                <p className="text-red-600">
                  <strong>Session Error:</strong> {serverAuth.sessionError}
                </p>
              )}
              {serverAuth.error && (
                <p className="text-red-600">
                  <strong>Error:</strong> {serverAuth.error}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim API Test */}
      <Card>
        <CardHeader>
          <CardTitle>Claim API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testClaimAPI}>Test Claim API</Button>
          {claimResult && (
            <div className="space-y-2">
              <p>
                <strong>Status:</strong> {claimResult.status}
              </p>
              <p>
                <strong>Success:</strong> {claimResult.success ? "Yes" : "No"}
              </p>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(claimResult.data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
