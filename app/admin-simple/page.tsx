"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"

export default function SimpleAdminPage() {
  const { user, loading, isAdmin, checkAdminStatusManually } = useAuth()
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("SimpleAdminPage mounted")
    console.log("User:", user)
    console.log("Loading:", loading)
    console.log("IsAdmin:", isAdmin)
  }, [user, loading, isAdmin])

  const handleCheckAdmin = async () => {
    try {
      console.log("Checking admin status manually...")
      const result = await checkAdminStatusManually()
      console.log("Admin check result:", result)
      setAdminStatus(result)
    } catch (err) {
      console.error("Admin check error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Simple Admin Page</h1>

        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4">Authentication Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Loading:</strong> {loading ? "Yes" : "No"}
              </p>
              <p>
                <strong>User:</strong> {user ? user.email : "Not signed in"}
              </p>
              <p>
                <strong>User ID:</strong> {user?.id || "None"}
              </p>
            </div>
            <div>
              <p>
                <strong>Is Admin (context):</strong> {isAdmin ? "Yes" : "No"}
              </p>
              <p>
                <strong>Manual Check Result:</strong>{" "}
                {adminStatus === null ? "Not checked" : adminStatus ? "Admin" : "Not Admin"}
              </p>
              {error && (
                <p className="text-red-600">
                  <strong>Error:</strong> {error}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={handleCheckAdmin}
              disabled={!user}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Check Admin Status
            </button>

            <a href="/admin" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 inline-block">
              Try /admin Route
            </a>
          </div>
        </div>

        {!user && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <strong>Warning:</strong> You are not signed in. Please sign in first.
            <div className="mt-2">
              <a
                href="/auth/signin"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block"
              >
                Sign In
              </a>
            </div>
          </div>
        )}

        {user && !isAdmin && adminStatus !== true && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Access Denied:</strong> You don't have admin privileges.
          </div>
        )}

        {(isAdmin || adminStatus === true) && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <strong>Success:</strong> You have admin access!
            <div className="mt-2">
              <a href="/admin" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 inline-block">
                Go to Admin Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
