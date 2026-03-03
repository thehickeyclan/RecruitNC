"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"

export default function AdminTestPage() {
  const { user, loading, isAdmin, checkAdminStatusManually } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [adminCheckResult, setAdminCheckResult] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAdminCheck = async () => {
    try {
      setError(null)
      const result = await checkAdminStatusManually()
      setAdminCheckResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  const handleGoToAdmin = () => {
    window.location.href = "/admin"
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Access Debug</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="space-y-2">
              <p>
                <strong>Loading:</strong> {loading ? "Yes" : "No"}
              </p>
              <p>
                <strong>User:</strong> {user ? user.email : "None"}
              </p>
              <p>
                <strong>User ID:</strong> {user ? user.id : "None"}
              </p>
              <p>
                <strong>Is Admin:</strong> {isAdmin ? "Yes" : "No"}
              </p>
              <p>
                <strong>Current Path:</strong> {pathname}
              </p>
            </div>
          </div>

          {/* Manual Admin Check */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Manual Admin Check</h2>
            <button
              onClick={handleAdminCheck}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
              disabled={!user}
            >
              Check Admin Status
            </button>

            {adminCheckResult !== null && (
              <p>
                <strong>Manual Check Result:</strong> {adminCheckResult ? "Admin" : "Not Admin"}
              </p>
            )}

            {error && (
              <p className="text-red-600">
                <strong>Error:</strong> {error}
              </p>
            )}
          </div>

          {/* Navigation Test */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Navigation Test</h2>
            <button onClick={handleGoToAdmin} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Go to /admin
            </button>
          </div>

          {/* Route Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Route Information</h2>
            <div className="space-y-2">
              <p>
                <strong>Current URL:</strong> {typeof window !== "undefined" ? window.location.href : "SSR"}
              </p>
              <p>
                <strong>Pathname:</strong> {pathname}
              </p>
              <p>
                <strong>Admin Route:</strong> {pathname?.startsWith("/admin") ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        {/* Debug Console */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Debug Console</h2>
          <div className="bg-gray-100 p-4 rounded text-sm font-mono">
            <p>Check the browser console for detailed logs</p>
            <p>Open Developer Tools → Console to see authentication flow</p>
          </div>
        </div>
      </div>
    </div>
  )
}
