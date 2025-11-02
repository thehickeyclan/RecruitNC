"use client"

import { useState, useEffect } from "react"
import { X, Bug } from "lucide-react"

export function MobileDebugPanel() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [debugInfo, setDebugInfo] = useState({
    isLoading: false,
    isAuthenticated: false,
    userEmail: "",
    profileRole: "",
    isAdmin: false,
    schoolId: "",
    pathname: "",
    cookieCount: 0,
  })

  // Only mount on client
  useEffect(() => {
    setMounted(true)
    addLog("🚀 Debug panel mounted")

    // Gather debug info safely
    try {
      const pathname = window.location.pathname
      const cookieCount = document.cookie.split(";").filter((c) => c.trim()).length

      setDebugInfo((prev) => ({
        ...prev,
        pathname,
        cookieCount,
      }))

      addLog(`📍 Page: ${pathname}`)
      addLog(`🍪 Cookies: ${cookieCount}`)
    } catch (error) {
      addLog(`❌ Error gathering info: ${error}`)
    }
  }, [])

  // Listen to auth context changes via custom events
  useEffect(() => {
    if (!mounted) return

    const handleAuthUpdate = (event: CustomEvent) => {
      const { isLoading, isAuthenticated, user, profile } = event.detail
      setDebugInfo((prev) => ({
        ...prev,
        isLoading,
        isAuthenticated,
        userEmail: user?.email || "",
        profileRole: profile?.role || "",
        isAdmin: profile?.is_admin || false,
        schoolId: profile?.school_id || "",
      }))
      addLog(`🔐 Auth update: loading=${isLoading}, auth=${isAuthenticated}, user=${!!user}, profile=${!!profile}`)
    }

    window.addEventListener("auth-update" as any, handleAuthUpdate)
    return () => window.removeEventListener("auth-update" as any, handleAuthUpdate)
  }, [mounted])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev.slice(-20), `[${timestamp}] ${message}`])
  }

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) return null

  // Only show on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  if (!isMobile) return null

  return (
    <>
      {/* Floating debug button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[9999] bg-red-600 text-white p-3 rounded-full shadow-lg"
          style={{ touchAction: "manipulation" }}
          aria-label="Open debug panel"
        >
          <Bug className="h-5 w-5" />
        </button>
      )}

      {/* Debug panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-end" onClick={() => setIsOpen(false)}>
          <div className="bg-white w-full max-h-[70vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
              <h3 className="font-bold text-lg">Mobile Debug</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Auth State */}
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h4 className="font-semibold mb-2">Auth State</h4>
              <div className="text-sm space-y-1">
                <div>
                  Loading: <span className="font-mono">{String(debugInfo.isLoading)}</span>
                </div>
                <div>
                  Authenticated: <span className="font-mono">{String(debugInfo.isAuthenticated)}</span>
                </div>
                <div>
                  User: <span className="font-mono">{debugInfo.userEmail || "null"}</span>
                </div>
                <div>
                  Profile Role: <span className="font-mono">{debugInfo.profileRole || "null"}</span>
                </div>
                <div>
                  Is Admin: <span className="font-mono">{String(debugInfo.isAdmin)}</span>
                </div>
                <div>
                  School ID: <span className="font-mono">{debugInfo.schoolId || "null"}</span>
                </div>
              </div>
            </div>

            {/* Page Info */}
            <div className="mb-4 p-3 bg-green-50 rounded">
              <h4 className="font-semibold mb-2">Page Info</h4>
              <div className="text-sm space-y-1">
                <div>
                  URL: <span className="font-mono text-xs">{debugInfo.pathname}</span>
                </div>
                <div>
                  Cookies: <span className="font-mono">{debugInfo.cookieCount}</span>
                </div>
              </div>
            </div>

            {/* Logs */}
            <div className="p-3 bg-gray-50 rounded">
              <h4 className="font-semibold mb-2">Logs</h4>
              <div className="text-xs font-mono space-y-1 max-h-[200px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-b border-gray-200 pb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setLogs([])
                  addLog("🗑️ Logs cleared")
                }}
                className="px-4 py-2 bg-gray-200 rounded text-sm"
              >
                Clear Logs
              </button>
              <button
                onClick={() => {
                  addLog("🔄 Page reloading...")
                  setTimeout(() => window.location.reload(), 100)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
